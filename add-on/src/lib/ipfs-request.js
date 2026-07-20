'use strict'

import debug from 'debug'

import isFQDN from 'is-fqdn'
import * as isIPFS from 'is-ipfs'
import { LRUCache } from 'lru-cache'
import { invalidAddressPagePath, recoveryPagePath } from './constants.js'
import { diagnoseAddress, encodeDiagnosis } from './invalid-address.js'
import { contentPathToNativeUri, dropSlash, pathAtHttpGateway, sameGateway } from './ipfs-path.js'
import { safeURL } from './options.js'
import { addRuleToDynamicRuleSetGenerator, isLocalHost, redirectOptOutHint, supportsDeclarativeNetRequest } from './redirect-handler/blockOrObserve.js'

const log = debug('ipfs-companion:request')
log.error = debug('ipfs-companion:request:error')

// Re-exported for tests; the string lives in blockOrObserve.js next to the DNR
// allow rule that enforces it under MV3.
export { redirectOptOutHint }
const recoverableNetworkErrors = new Set([
  // Firefox
  'NS_ERROR_UNKNOWN_HOST', // dns failure
  'NS_ERROR_NET_TIMEOUT', // eg. httpd is offline
  'NS_ERROR_NET_RESET', // failed to load because the server kept reseting the connection
  'NS_ERROR_NET_ON_RESOLVED', // no network
  // Chrome
  'net::ERR_NAME_NOT_RESOLVED', // dns failure
  'net::ERR_CONNECTION_TIMED_OUT', // eg. httpd is offline
  'net::ERR_INTERNET_DISCONNECTED' // no network
])
// 4xx is the gateway answering about the resource (e.g. 404 for missing
// content); only 5xx means the gateway itself is unhealthy and worth recovering
const recoverableHttpError = (code) => code && code >= 500

// Tracking late redirects for edge cases such as https://github.com/ipfs-shipyard/ipfs-companion/issues/436
const onHeadersReceivedRedirect = new Set()
let addRuleToDynamicRuleSet = null

// Request modifier provides event listeners for the various stages of making an HTTP request
// API Details: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest
export function createRequestModifier (getState, dnslinkResolver, ipfsPathValidator, runtime) {
  const browser = runtime.browser
  const runtimeRoot = browser.runtime.getURL('/')
  const webExtensionOrigin = runtimeRoot ? new URL(runtimeRoot).origin : 'http://companion-origin' // avoid 'null' because it has special meaning
  addRuleToDynamicRuleSet = addRuleToDynamicRuleSetGenerator(getState)
  const isCompanionRequest = (request) => {
    // We inspect webRequest object (WebExtension API) instead of Origin HTTP
    // header because the value of the latter changed over the years ad
    // absurdum. It leaks the unique extension ID and no vendor seem to have
    // coherent  policy around it, Firefox and Chromium flip back and forth:
    // Firefox  Nightly 65 sets moz-extension://{extension-installation-id}
    // Chromium        <72 sets null
    // Chromium Beta    72 sets chrome-extension://{uid}
    // Firefox  Nightly 85 sets null
    const { originUrl, initiator } = request
    // Of course, getting "Origin" is vendor-specific:
    // FF: originUrl (Referer-like Origin URL with path)
    // Chromium: initiator (just Origin, no path)
    // Because of this mess, we normalize Origin by reading it from URL.origin
    const { origin } = new URL(originUrl || initiator || 'http://missing-origin')
    return origin === webExtensionOrigin
  }

  // Various types of requests are identified once and cached across all browser.webRequest hooks
  const requestCacheCfg = { max: 128, ttl: 1000 * 30 }
  const ignoredRequests = new LRUCache(requestCacheCfg)
  const ignore = (id) => ignoredRequests.set(id, true)
  const isIgnored = (id) => ignoredRequests.get(id) !== undefined
  const errorInFlight = new LRUCache({ max: 3, ttl: 1000 })

  // Returns a canonical hostname representing the site from url
  // Main reason for this is unwrapping DNSLink from local subdomain
  // <fqdn>.ipns.localhost → <fqdn>
  const findSiteFqdn = async (url) => {
    if (isIPFS.ipnsSubdomain(url)) {
      // convert subdomain's <fqdn>.ipns.gateway.tld to <fqdn>
      const fqdn = await dnslinkResolver.findDNSLinkHostname(url)
      if (fqdn) return fqdn
    }
    return new URL(url).hostname
  }

  // Finds canonical hostname of request.url and its parent page (if present)
  const findSiteHostnames = async (request) => {
    const { url, originUrl, initiator } = request
    const fqdn = await findSiteFqdn(url)
    // FF: originUrl (Referer-like Origin URL), Chrome: initiator (just Origin)
    const parentUrl = originUrl || initiator
    // String value 'null' is explicitly set by Chromium in some contexts
    const parentFqdn = parentUrl && parentUrl !== 'null' && url !== parentUrl
      ? await findSiteFqdn(parentUrl)
      : null
    return { fqdn, parentFqdn }
  }

  const preNormalizationSkip = async (state, request) => {
    // skip requests to the custom gateway or API (otherwise we have too much recursion)
    if (sameGateway(request.url, state.gwURL) || sameGateway(request.url, state.apiURL)) {
      ignore(request.requestId)
    }
    // skip websocket handshake (not supported by HTTP2IPFS gateways)
    if (request.type === 'websocket') {
      ignore(request.requestId)
    }
    // skip all local requests
    if (isLocalHost(request.url)) {
      ignore(request.requestId)
    }

    // skip if a per-site opt-out exists
    const { fqdn, parentFqdn } = await findSiteHostnames(request)
    const triggerOptOut = (optout) => {
      // Disable optout on canonical public gateway
      if (fqdn === 'gateway.ipfs.io') return false
      if (fqdn.endsWith(optout) || (parentFqdn && parentFqdn.endsWith(optout))) return true
      return false
    }
    if (state.disabledOn.some(triggerOptOut)) {
      ignore(request.requestId)
    }

    // additional checks limited to requests for root documents
    if (request.type === 'main_frame') {
      // lazily trigger DNSLink lookup (will do anything only if status for root domain is not in cache)
      if (dnslinkResolver.canLookupURL(request.url)) {
        dnslinkResolver.resolve(request.url) // no await: populate cache in background
      }
    }
    return isIgnored(request.requestId)
  }

  const postNormalizationSkip = (state, request) => {
    // skip requests to the public gateway if we can't reedirect them to local
    // node is running (otherwise we have too much recursion)
    if (!state.localGwAvailable && sameGateway(request.url, state.pubGwURL)) {
      ignore(request.requestId)
      // TODO: do not skip and redirect to `ipfs://` and `ipns://` if hasNativeProtocolHandler === true
    }
    return isIgnored(request.requestId)
  }

  // After a best-effort DNSLink lookup finishes for a main_frame navigation
  // that already committed to its http(s) URL, re-navigate the tab to the
  // mutable /ipns/ gateway address. Best-effort defers the lookup to the
  // background, so the first visit to a DNSLink site would otherwise sit on the
  // original URL until a manual refresh.
  // https://github.com/ipfs/ipfs-companion/issues/1072
  const lateDnslinkRedirect = async (request, dnslink) => {
    if (!dnslink) return // no record, offline, or negative result
    log(`lateDnslinkRedirect: DNSLink for ${request.url} resolved to ${dnslink}`)
    const state = getState()
    if (!state.active || !state.redirect || !state.dnslinkRedirect) return
    if (!state.localGwAvailable) return // only upgrade to the local mutable address when the node is around
    if (!dnslinkResolver.canLookupURL(request.url)) return // policy turned off, or now a gateway URL
    if (request.type !== 'main_frame') return
    if (request.method && request.method !== 'GET') return // don't turn a POST into a gateway GET
    if (!isSafeToRedirect(request, runtime, state)) return
    const dnslinkAtGw = await dnslinkResolver.dnslinkAtGateway(request.url, dnslink)
    if (!dnslinkAtGw) return
    log(`lateDnslinkRedirect: upgrading ${request.url} to ${dnslinkAtGw}`)
    // In MV3 redirectToGateway installs the DNR rule and re-navigates matching
    // tabs itself: updateTabToNewUrl retries until the tab commits the origin and
    // only touches tabs still on it, so it works even when the lookup resolves
    // before the tab commits, and it never hijacks a tab the user has moved. In
    // MV2 it returns the target and we navigate the initiating tab, as the
    // onErrorOccurred and onCompleted late redirects already do.
    const redirect = await redirectToGateway(request, dnslinkAtGw, state, ipfsPathValidator, runtime)
    if (redirect && redirect.redirectUrl) {
      await updateTabWithURL(request, redirect.redirectUrl, browser)
    }
  }

  // Recover from a redirect miss on a top-level navigation. A service worker
  // gateway (e.g. inbrowser.link) can answer a navigation from its own cache, so
  // no network request reaches declarativeNetRequest or the onBeforeRequest
  // observer, and the tab stays on the public gateway (see the service worker
  // gateway gotcha in docs/MV3.md). webNavigation.onCommitted still fires, so
  // when a main-frame navigation commits to public gateway content we would have
  // redirected, and a local gateway is available, send the tab there with
  // tabs.update. https://github.com/ipfs/ipfs-companion/issues/1299
  const recoverRedirectMiss = async ({ url, frameId, tabId, transitionQualifiers }) => {
    if (frameId !== 0) return // top-level navigation only
    const state = getState()
    if (!state.active || !state.redirect) return
    if (!state.localGwAvailable) return // only reclaim when the local gateway is up
    // already at the local/custom gateway or API, or a local address: nothing to do
    if (sameGateway(url, state.gwURL) || sameGateway(url, state.apiURL)) return
    if (isLocalHost(url)) return
    // don't fight Back/Forward: tabs.update adds a history entry and would trap Back
    if (transitionQualifiers?.includes('forward_back')) return
    if (!state.activeIntegrations(url)) return // per-site opt-out
    const request = { url, type: 'main_frame', tabId }
    if (!isSafeToRedirect(request, runtime, state)) return // ?x-ipfs-companion-no-redirect
    if (!await ipfsPathValidator.publicIpfsOrIpnsResource(url)) return // not serviceable over IPFS
    const redirectUrl = await ipfsPathValidator.resolveToLocalUrl(url)
    if (!redirectUrl || redirectUrl === url) return
    log(`recoverRedirectMiss: reclaiming ${url} to ${redirectUrl}`)
    await updateTabWithURL(request, redirectUrl, browser)
  }

  // Build RequestModifier
  return {
    // exposed for tests: drive the post-lookup tab redirect directly instead of
    // draining the background lookup queue
    lateDnslinkRedirect,
    // browser.webNavigation.onCommitted recovery for redirect misses (e.g. a
    // service worker gateway serving the page from cache); see recoverRedirectMiss
    recoverRedirectMiss,
    // browser.webRequest.onBeforeRequest
    // This event is triggered when a request is about to be made, and before headers are available.
    // This is a good place to listen if you want to cancel or redirect the request.
    async onBeforeRequest (request) {
      const state = getState()
      if (!state.active) return

      // When local IPFS node is unreachable , show recovery page where user can redirect
      // to public gateway.
      if (!state.nodeActive && request.type === 'main_frame' && sameGateway(request.url, state.gwURL)) {
        const publicUri = await ipfsPathValidator.resolveToPublicUrl(request.url, state.pubGwURLString)
        return handleRedirection({
          originUrl: request.url,
          redirectUrl: `${dropSlash(runtimeRoot)}${recoveryPagePath}#${encodeURIComponent(publicUri)}`,
          request
        })
      }

      // When Subdomain Proxy is enabled we normalize address bar requests made
      // to the local gateway and replace raw IP with 'localhost' hostname to
      // take advantage of subdomain redirect provided by go-ipfs >= 0.5
      if (state.redirect && request.type === 'main_frame' && sameGateway(request.url, state.gwURL)) {
        const redirectUrl = safeURL(request.url, { useLocalhostName: state.useSubdomains }).toString()
        return handleRedirection({
          originUrl: request.url,
          redirectUrl,
          request
        })
      }

      // For now normalize API to the IP to comply with go-ipfs checks
      if (state.redirect && request.type === 'main_frame' && sameGateway(request.url, state.apiURL)) {
        const redirectUrl = safeURL(request.url, { useLocalhostName: false }).toString()
        return handleRedirection({
          originUrl: request.url,
          redirectUrl,
          request
        })
      }

      // early sanity checks
      if (await preNormalizationSkip(state, request)) {
        return
      }
      // poor-mans protocol handlers - https://github.com/ipfs/ipfs-companion/issues/164#issuecomment-328374052
      if (state.catchUnhandledProtocols && mayContainUnhandledIpfsProtocol(request)) {
        const pubGwUrl = state.pubGwURLString || state.gwURLString
        // Addresses that cannot work as written get an explainer instead of a
        // silent fixup. See diagnoseAddress for what counts and why.
        const diagnosis = diagnoseAddress(unhandledIpfsPath(request.url))
        if (diagnosis) {
          return showInvalidAddressPage(request, diagnosis, pubGwUrl, runtimeRoot, browser)
        }
        const fix = await normalizedUnhandledIpfsProtocol(request, pubGwUrl)
        if (fix) {
          return fix
        }
      }
      // handler for protocol_handlers from manifest.json
      if (redirectingProtocolRequest(request)) {
        // fix path passed via custom protocol
        const fix = normalizedRedirectingProtocolRequest(request, state.pubGwURLString || state.gwURLString)
        if (fix) {
          return fix
        }
      }
      // handle redirects to custom gateway
      if (state.redirect) {
        // late sanity checks
        if (postNormalizationSkip(state, request)) {
          return
        }
        // Detect valid /ipfs/ and /ipns/ on any site
        if (await ipfsPathValidator.publicIpfsOrIpnsResource(request.url) && isSafeToRedirect(request, runtime, state)) {
          return redirectToGateway(request, request.url, state, ipfsPathValidator, runtime)
        }
        // DNSLink: look up the domain in the background (gated by dnslinkLookup
        // via canLookupURL) so we know whether it is an IPFS site, for
        // browser-action items and for redirect. When dnslinkRedirect is on,
        // redirect to the local gateway: right away if the DNSLink is already
        // cached, or once the background lookup resolves (lateDnslinkRedirect).
        if (dnslinkResolver.canLookupURL(request.url)) {
          if (state.dnslinkRedirect) {
            const dnslinkAtGw = await dnslinkResolver.dnslinkAtGateway(request.url)
            if (dnslinkAtGw && isSafeToRedirect(request, runtime, state)) {
              return redirectToGateway(request, dnslinkAtGw, state, ipfsPathValidator, runtime)
            }
          }
          // populate the cache even when redirect is off (browser-action items
          // rely on it); the late redirect no-ops unless dnslinkRedirect is on
          const resolving = dnslinkResolver.resolve(request.url)
          if (request.type === 'main_frame') {
            resolving.then((dnslink) => lateDnslinkRedirect(request, dnslink)).catch((err) => log.error('lateDnslinkRedirect failed', err))
          }
        }
      }
    },

    // browser.webRequest.onBeforeSendHeaders
    // This event is triggered before sending any HTTP data, but after all HTTP headers are available.
    // This is a good place to listen if you want to modify HTTP request headers.
    onBeforeSendHeaders (request) {
      const state = getState()
      if (!state.active) return

      // Special handling of requests made to API
      if (sameGateway(request.url, state.apiURL)) {
        const { requestHeaders } = request

        if (isCompanionRequest(request)) {
          // '403 - Forbidden' fix for browsers that support blocking webRequest API (e.g. Firefox)
          // --------------------------------------------
          // We update "Origin: *-extension://" HTTP headers in requests made to API
          // by js-kubo-rpc-client running in the background page of browser
          // extension.  Without this, some users would need to do manual CORS
          // whitelisting by adding "..extension://<UUID>" to
          // API.HTTPHeaders.Access-Control-Allow-Origin in go-ipfs config.
          // With this, API calls made by browser extension look like ones made
          // by webui loaded from the API port.
          // More info:
          // Firefox 65: https://github.com/ipfs-shipyard/ipfs-companion/issues/622
          // Firefox 85: https://github.com/ipfs-shipyard/ipfs-companion/issues/955
          // Chromium 71: https://github.com/ipfs-shipyard/ipfs-companion/pull/616
          // Chromium 72: https://github.com/ipfs-shipyard/ipfs-companion/issues/630
          const foundAt = requestHeaders.findIndex(h => h.name.toLowerCase() === 'origin')
          const { origin } = state.apiURL
          if (foundAt > -1) {
            // Replace existing Origin with the origin of the API itself.
            // This removes the need for CORS setup in go-ipfs config and
            // ensures there is no HTTP Error 403 Forbidden.
            requestHeaders[foundAt].value = origin
          } else { // future-proofing
            // Origin is missing, and go-ipfs requires it in browsers:
            // https://github.com/ipfs/go-ipfs-cmds/pull/193
            requestHeaders.push({ name: 'Origin', value: origin })
          }
        }

        // Fix "http: invalid Read on closed Body"
        // ----------------------------------
        // There is a bug in go-ipfs related to keep-alive connections
        // that results in partial response for ipfs.add
        // mangled by error "http: invalid Read on closed Body"
        // More info (ipfs-companion): https://github.com/ipfs-shipyard/ipfs-companion/issues/480
        // More info (go-ipfs): https://github.com/ipfs/go-ipfs/issues/5168
        if (request.url.includes('/api/v0/add') && request.url.includes('stream-channels=true')) {
          let addExpectHeader = true
          const expectHeader = { name: 'Expect', value: '100-continue' }
          const warningMsg = 'Executing "Expect: 100-continue" workaround for ipfs.add due to https://github.com/ipfs/go-ipfs/issues/5168'
          for (const header of requestHeaders) {
            // Workaround A: https://github.com/ipfs/go-ipfs/issues/5168#issuecomment-401417420
            // (works in Firefox, but Chromium does not expose Connection header)
            /* (disabled so we use the workaround B in all browsers)
            if (header.name === 'Connection' && header.value !== 'close') {
              console.warn('[ipfs-companion] Executing "Connection: close" workaround for ipfs.add due to https://github.com/ipfs/go-ipfs/issues/5168')
              header.value = 'close'
              addExpectHeader = false
              break
            }
            */
            // Workaround B: https://github.com/ipfs-shipyard/ipfs-companion/issues/480#issuecomment-417657758
            // (works in Firefox 63 AND Chromium 67)
            if (header.name === expectHeader.name) {
              addExpectHeader = false
              if (header.value !== expectHeader.value) {
                log(warningMsg)
                header.value = expectHeader.value
              }
              break
            }
          }
          if (addExpectHeader) {
            log(warningMsg)
            requestHeaders.push(expectHeader)
          }
        }
        return { requestHeaders }
      }
    },

    // browser.webRequest.onHeadersReceived
    // Fired when the HTTP response headers associated with a request have been received.
    // You can use this event to modify HTTP response headers or do a very late redirect.
    async onHeadersReceived (request) {
      const state = getState()
      if (!state.active) return

      // Skip if request is marked as ignored
      if (isIgnored(request.requestId)) {
        return
      }

      if (state.redirect) {
        // Late redirect as a workaround for edge cases such as:
        // - CORS XHR in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
        if (runtime.requiresXHRCORSfix && onHeadersReceivedRedirect.has(request.requestId)) {
          onHeadersReceivedRedirect.delete(request.requestId)
          if (state.dnslinkRedirect) {
            const dnslinkAtGw = await dnslinkResolver.dnslinkAtGateway(request.url)
            if (dnslinkAtGw) {
              return redirectToGateway(request, dnslinkAtGw, state, ipfsPathValidator, runtime)
            }
          }
          return redirectToGateway(request, request.url, state, ipfsPathValidator, runtime)
        }

        // Legacy opt-in, off by default: when a site sends the x-ipfs-path
        // response header, redirect to the exact /ipfs/ path it carries. Walled
        // behind redirectToXIpfsPathValue because it is unsafe: a site that sets
        // this header but has no DNSLink is misconfigured hosting (e.g. how
        // https://fleek.co was set up in the past) and the redirect strands the
        // user on an immutable snapshot. DNSLink sites are upgraded generically
        // (the onBeforeRequest lookup plus lateDnslinkRedirect), which never
        // uses the header value. https://github.com/ipfs/ipfs-companion/issues/1052
        const { url } = request
        const notActiveGatewayOrApi = !(sameGateway(url, state.pubGwURL) || sameGateway(url, state.gwURL) || sameGateway(url, state.apiURL))
        if (state.redirectToXIpfsPathValue && request.responseHeaders && notActiveGatewayOrApi) {
          for (const header of request.responseHeaders) {
            if (header.name.toLowerCase() !== 'x-ipfs-path' || !isSafeToRedirect(request, runtime, state)) {
              continue
            }
            const xIpfsPath = header.value
            // only act on immutable /ipfs/ snapshots; an /ipns/ value would be a
            // DNSLink, already handled generically without the header
            if (!isIPFS.ipfsPath(xIpfsPath)) {
              continue
            }
            // a gateway-shaped URL already carries its content path in the URL,
            // so a header from the gateway must not override it
            if (isIPFS.url(request.url)) {
              continue
            }
            const { search, hash } = new URL(request.url)
            const newUrl = pathAtHttpGateway(`${xIpfsPath}${search}${hash}`, state.pubGwURLString || state.gwURLString)
            if (newUrl && state.localGwAvailable) {
              log(`onHeadersReceived: redirecting ${request.url} to x-ipfs-path value ${newUrl} (redirectToXIpfsPathValue opt-in)`)
              return redirectToGateway(request, newUrl, state, ipfsPathValidator, runtime)
            }
          }
        }
      }
    },

    // browser.webRequest.onErrorOccurred
    // Fired when a request could not be processed due to an error on network level.
    // For example: TCP timeout, DNS lookup failure
    // NOTE: this is executed only if webRequest.ResourceType='main_frame'
    async onErrorOccurred (request) {
      const state = getState()
      if (!state.active) return

      // Avoid duplicates in Chromium, which fires two events instead of one
      // https://github.com/ipfs-shipyard/ipfs-companion/issues/805
      if (errorInFlight.has(request.url)) return
      errorInFlight.set(request.url, request.requestId)

      // Skip additional requests produced by DNS fixup logic in Firefox
      // https://github.com/ipfs-shipyard/ipfs-companion/issues/804
      if (request.error === 'NS_ERROR_UNKNOWN_HOST' && request.url.includes('://www.')) {
        const urlBeforeFixup = request.url.replace('://www.', '://')
        if (errorInFlight.has(urlBeforeFixup)) return
      }

      // Check if error can be recovered via EthDNS
      if (isRecoverableViaEthDNS(request, state)) {
        const url = new URL(request.url)
        url.hostname = `${url.hostname}.link`
        url.protocol = 'https:' // force HTTPS, as HSTS may be missing on initial load
        const redirectUrl = url.toString()
        log(`onErrorOccurred: attempting to recover from DNS error (${request.error}) using EthDNS for ${request.url} → ${redirectUrl}`, request)
        return updateTabWithURL(request, redirectUrl, browser)
      }

      // Check if error can be recovered via DNSLink
      if (isRecoverableViaDNSLink(request, state, dnslinkResolver)) {
        const { hostname } = new URL(request.url)
        const dnslink = await dnslinkResolver.readAndCacheDnslink(hostname)
        if (dnslink) {
          const redirectUrl = await dnslinkResolver.dnslinkAtGateway(request.url, dnslink)
          log(`onErrorOccurred: attempting to recover from network error (${request.error}) using dnslink for ${request.url} → ${redirectUrl}`, request)
          // We are unable to redirect in onErrorOccurred, but we can update the tab
          return updateTabWithURL(request, redirectUrl, browser)
        }
      }

      // Cleanup after https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      if (runtime.requiresXHRCORSfix && onHeadersReceivedRedirect.has(request.requestId)) {
        onHeadersReceivedRedirect.delete(request.requestId)
      }

      // Check if error can be recovered by opening same content-addresed path
      // using active gateway (public or local, depending on redirect state)
      if (await isRecoverable(request, state, ipfsPathValidator)) {
        const redirectUrl = await recoveryUrlForFailedRequest(request, state, ipfsPathValidator, runtimeRoot)
        if (redirectUrl) {
          log(`onErrorOccurred: attempting to recover from network error (${request.error}) for ${request.url} → ${redirectUrl}`, request)
          // We are unable to redirect in onErrorOccurred, but we can update the tab
          return updateTabWithURL(request, redirectUrl, browser)
        }
      }
    },

    // browser.webRequest.onCompleted
    // Fired when HTTP request is completed (successfully or with an error code)
    // NOTE: this is executed only if webRequest.ResourceType='main_frame'
    async onCompleted (request) {
      const state = getState()
      if (!state.active) return
      if (request.statusCode === 200) return // finish if no error to recover from

      // Seamlessly fix canonical link when DNSLink breaks ipfs.io/blog/*
      /// https://github.com/ipfs/blog/issues/360
      if (request.type === 'main_frame' &&
          request.statusCode === 404 &&
          request.url.match(/\/\/[^/]+\/ipns\/ipfs\.io\/blog\//)) {
        log('onCompleted: fixing /ipns/ipfs.io/blog → /ipns/blog.ipfs.io')
        const fixedUrl = request.url.replace('/ipns/ipfs.io/blog', '/ipns/blog.ipfs.io')

        // Chromium bug: sometimes tabs.update does not work from onCompleted,
        // we run additional update after 1s just to be sure
        setTimeout(() => browser.tabs.update(request.tabId, { url: fixedUrl }), 1000)

        return browser.tabs.update(request.tabId, { url: fixedUrl })
      }

      if (await isRecoverable(request, state, ipfsPathValidator)) {
        const redirectUrl = await recoveryUrlForFailedRequest(request, state, ipfsPathValidator, runtimeRoot)
        if (redirectUrl) {
          log(`onCompleted: attempting to recover from HTTP Error ${request.statusCode} for ${request.url} → ${redirectUrl}`, request)
          return updateTabWithURL(request, redirectUrl, browser)
        }
      }
    }
  }
}

/**
 * Handles redirection in MV2 and MV3.
 *
 * @param {object} input contains originUrl and redirectUrl.
 * @returns
 */
async function handleRedirection ({ originUrl, redirectUrl, request }) {
  if (redirectUrl !== '' && originUrl !== '' && redirectUrl !== originUrl) {
    if (!supportsDeclarativeNetRequest()) {
      return { redirectUrl }
    }

    // Let browser handle redirection MV3 style.
    await addRuleToDynamicRuleSet({ originUrl, redirectUrl })
  }
}

// Returns a string with URL at the active gateway (local or public)
async function redirectToGateway (request, url, state, ipfsPathValidator, runtime) {
  // When subresource redirects are disabled, only redirect top-level document
  // navigations. Embedded subresources keep loading from their original
  // origin, which avoids sharing the local gateway origin across unrelated
  // sites (a super-cookie vector) and Chrome Local Network Access prompts for
  // subresource loads. https://github.com/ipfs/ipfs-companion/issues/1052
  if (!state.redirectSubresources && request.type !== 'main_frame') {
    return
  }
  const { resolveToPublicUrl, resolveToLocalUrl } = ipfsPathValidator
  let redirectUrl = await (state.localGwAvailable ? resolveToLocalUrl(url) : resolveToPublicUrl(url))

  // SUBRESOURCE ON HTTPS PAGE: THE WORKAROUND EXTRAVAGANZA
  // ------------------------------------------------------ \o/
  //
  // Firefox 74 does not mark *.localhost subdomains as Secure Context yet
  // (https://bugzilla.mozilla.org/show_bug.cgi?id=1220810#c23) so we can't
  // redirect there when we have IPFS resource embedded on HTTPS page (eg.
  // image loaded from a public gateway) because that would cause mixed-content
  // warning and subresource would fail to load.  Given the fact that
  // localhost/ipfs/* provided by go-ipfs 0.5+ returns a redirect to
  // *.ipfs.localhost subdomain we need to check requests for subresources, and
  // manually replace 'localhost' hostname with '127.0.0.1' (IP is hardcoded as
  // Secure Context in Firefox). The need for this workaround can be revisited
  // when Firefox closes mentioned bug.
  //
  // Chromium 80 seems to force HTTPS in the final URL (after all redirects) so
  // https://*.localhost fails TODO: needs additional research (could be a bug
  // in Chromium). For now we reuse the same workaround as Firefox.
  //
  if (state.localGwAvailable) {
    const { type, originUrl, initiator } = request
    // match request types for embedded subresources, but skip ones coming from local gateway
    const parentUrl = originUrl || initiator // FF || Chromium
    if (type !== 'main_frame' && (parentUrl && !sameGateway(parentUrl, state.gwURL))) {
      // use raw IP to ensure subresource will be loaded from the path gateway
      // at 127.0.0.1, which is marked as Secure Context in all browsers
      const useLocalhostName = false
      redirectUrl = safeURL(redirectUrl, { useLocalhostName }).toString()
    }
  }

  return handleRedirection({
    originUrl: request.url,
    redirectUrl,
    request
  })
}

function isSafeToRedirect (request, runtime, state) {
  const { url, type, originUrl } = request
  // Honor the per-request opt-out hint unless the experiment is turned off.
  // The MV3 network-layer counterpart is the DNR allow rule in blockOrObserve.js,
  // gated on the same honorRedirectOptOutHint option.
  if (state.honorRedirectOptOutHint) {
    // Do not redirect if URL includes opt-out hint
    if (url.includes(redirectOptOutHint)) {
      return false
    }
    // Do not redirect if parent URL in address bar includes opt-out hint
    // Note: this works only in Firefox, Chromium does not provide full originUrl, only hostname in request.initiator
    if (type !== 'main_frame' && originUrl && originUrl.includes(redirectOptOutHint)) {
      return false
    }
  }

  // Ignore XHR requests for which redirect would fail due to CORS bug in Firefox
  // See: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
  if (runtime.requiresXHRCORSfix && request.type === 'xmlhttprequest' && !request.responseHeaders) {
    // Sidenote on XHR Origin: Firefox 60 uses request.originUrl, Chrome 63 uses request.initiator
    if (request.originUrl) {
      const sourceOrigin = new URL(request.originUrl).origin
      const targetOrigin = new URL(request.url).origin
      if (sourceOrigin !== targetOrigin) {
        log('Delaying redirect of CORS XHR until onHeadersReceived due to https://github.com/ipfs-shipyard/ipfs-companion/issues/436 :', request.url)
        onHeadersReceivedRedirect.add(request.requestId)
        return false
      }
    }
  }

  // Workaround for Brave Shields interfering with IPFS resource redirects
  // https://github.com/ipfs-shipyard/ipfs-companion/issues/962
  //
  // Brave Shields blocks redirects of subresources (non-main-frame requests) when
  // certain shield settings are enabled. This causes IPFS resources loaded as
  // subresources (images, scripts, styles, etc.) to fail when redirected from
  // public gateways to local node.
  //
  // Currently, we conservatively block ALL subresource redirects in Brave to avoid
  // breaking page loads. This means IPFS subresources will load from public gateways
  // instead of the local node when Shields are enabled.
  //
  // TODO: Implement smarter detection when Brave provides an API to check Shields status.
  // See: https://github.com/ipfs/ipfs-companion/issues/1095
  if (runtime.isBrave && request.type !== 'main_frame') {
    log(`Skipping redirect of IPFS subresource (${request.type}) due to potential Brave Shields interference: ${request.url}`)
    return false
  }

  return true
}

// REDIRECT-BASED PROTOCOL HANDLERS
// This API is available only Firefox (protocol_handlers from manifest.json)
// Background: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-282513891
// Notes on removal of web+ in Firefox 59: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-355708883
// ===================================================================

// This is just a placeholder that we had to provide -- removed in normalizedRedirectingProtocolRequest()
// It has to match URL from manifest.json/protocol_handlers
const redirectingProtocolEndpoint = 'https://dweb.link/ipfs/?uri='

function redirectingProtocolRequest (request) {
  return request.url.startsWith(redirectingProtocolEndpoint)
}

function normalizedRedirectingProtocolRequest (request, pubGwUrl) {
  const oldPath = decodeURIComponent(new URL(request.url).hash)
  let path = oldPath
  // prefixed (Firefox < 59)
  path = path.replace(/^#web\+dweb:\//i, '/') // web+dweb:/ipfs/Qm → /ipfs/Qm
  path = path.replace(/^#web\+ipfs:\/\//i, '/ipfs/') // web+ipfs://Qm → /ipfs/Qm
  path = path.replace(/^#web\+ipns:\/\//i, '/ipns/') // web+ipns://Qm → /ipns/Qm
  // without prefix (Firefox >= 59)
  path = path.replace(/^#dweb:\//i, '/') // dweb:/ipfs/Qm → /ipfs/Qm
  path = path.replace(/^#ipfs:\/\//i, '/ipfs/') // ipfs://Qm → /ipfs/Qm
  path = path.replace(/^#ipns:\/\//i, '/ipns/') // ipns://Qm → /ipns/Qm
  // additional fixups of the final path
  path = fixupDnslinkPath(path) // the invalid /ipfs/<website name> → /ipns/<website name>
  if (oldPath !== path && isIPFS.path(path)) {
    return handleRedirection({
      originUrl: request.url,
      redirectUrl: pathAtHttpGateway(path, pubGwUrl),
      request
    })
  }
  return null
}

// Idempotent rewrite of a website name off the immutable namespace, e.g. the
// invalid /ipfs/en.wikipedia-on-ipfs.org → the correct /ipns/en.wikipedia-on-ipfs.org.
// A website name resolves through DNSLink and its owner can repoint it at any
// time, so it is never valid under /ipfs/, which promises fixed content.
// Reached only by the legacy fragment-based protocol handler below; addresses
// arriving through the search-hijack path are explained to the user instead
// (see diagnoseAddress in invalid-address.js).
function fixupDnslinkPath (path) {
  if (!(path && path.startsWith('/ipfs/'))) return path
  const [, root] = path.match(/^\/ipfs\/([^/?#]+)/)
  if (root && !isIPFS.cid(root) && isFQDN(root)) {
    return path.replace(/^\/ipfs\//, '/ipns/')
  }
  return path
}

// SEARCH-HIJACK HANDLERS: UNIVERSAL FALLBACK FOR UNHANDLED PROTOCOLS
// (Used in Chrome and other browsers that do not provide better alternatives)
// Background: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-328374052
// ===================================================================

const unhandledIpfsRE = /=(?:web%2B|)(ipfs(?=%3A%2F%2F)|ipns(?=%3A%2F%2F)|dweb(?=%3A%2Fip[f|n]s))%3A(?:%2F%2F|%2F)([^&]+)/

function mayContainUnhandledIpfsProtocol (request) {
  return request.type === 'main_frame' && request.url.includes('%3A%2F')
}

function unhandledIpfsPath (requestUrl) {
  const unhandled = requestUrl.match(unhandledIpfsRE)
  if (unhandled && unhandled.length > 1) {
    const unhandledProtocol = decodeURIComponent(unhandled[1])
    const unhandledPath = `/${decodeURIComponent(unhandled[2])}`
    return isIPFS.path(unhandledPath) ? unhandledPath : `/${unhandledProtocol}${unhandledPath}`
  }
  return null
}

function normalizedUnhandledIpfsProtocol (request, pubGwUrl) {
  // Addresses this cannot handle were already diagnosed by the caller, so no
  // DNSLink fixup happens here: an ipfs:// address naming a DNSLink website is
  // wrong and gets explained, never silently rewritten.
  const path = unhandledIpfsPath(request.url)
  if (isIPFS.path(path)) {
    // replace search query with a request to a public gateway
    // (will be redirected later, if needed)
    return handleRedirection({
      originUrl: request.url,
      redirectUrl: pathAtHttpGateway(path, pubGwUrl),
      request
    })
  }
  return null
}

// Open the explainer for an address that cannot work as written, e.g. the
// invalid `ipfs://en.wikipedia-on-ipfs.org` (a website name is mutable, so it
// belongs to ipns://).
//
// Unlike every other redirect in this file it deliberately avoids
// handleRedirection, because under MV3 that installs a persistent
// declarativeNetRequest rule. A rule matches by pattern, but this page is a
// verdict on one specific address, so the rule would go on to serve that verdict
// to unrelated URLs on the same host: one bad address typed into a search bar
// ended up redirecting every later search to this page. Navigating the tab is
// also what the rule-based path does for the request that triggers it
// (addRuleToDynamicRuleSet calls updateTabToNewUrl before building the rule),
// so nothing is lost by skipping the rule.
function showInvalidAddressPage (request, diagnosis, pubGwUrl, runtimeRoot, browser) {
  const pageUrl = invalidAddressPageUrl(diagnosis, pubGwUrl, runtimeRoot)
  if (!supportsDeclarativeNetRequest()) {
    return { redirectUrl: pageUrl }
  }
  // MV3 has no blocking redirect. A tab that went away in the meantime must not
  // throw out of the listener.
  void updateTabWithURL(request, pageUrl, browser)
    .catch(err => log.error('failed to open the invalid address page', err))
  return null
}

// Build the address of the explainer page, carrying the diagnosis in the
// fragment. The suggested address is shown to the user and the gateway URL
// backs the continue button, so a click lands on the content itself rather than
// on another address the browser cannot open.
function invalidAddressPageUrl ({ reason, address, suggestedPath }, pubGwUrl, runtimeRoot) {
  const fragment = encodeDiagnosis({
    reason,
    address,
    suggestedAddress: suggestedPath ? contentPathToNativeUri(suggestedPath) : null,
    suggestedUrl: suggestedPath ? pathAtHttpGateway(suggestedPath, pubGwUrl) : null
  })
  return `${dropSlash(runtimeRoot)}${invalidAddressPagePath}#${fragment}`
}

// RECOVERY OF FAILED REQUESTS
// ===================================================================

// Resolve a failed request to a loadable gateway URL for recovery: a
// configured public gateway first (skipped when the failure happened at that
// very gateway), then the local gateway when the node is online. Returns null
// when nothing loadable is left; callers fall back to the recovery page, so we
// never navigate a tab to a native ipfs:// URI that browsers without a
// protocol handler cannot open.
async function resolveToActiveGatewayUrl (url, state, ipfsPathValidator) {
  const failedAtPublicGw = sameGateway(url, state.pubGwURL) || sameGateway(url, state.pubSubdomainGwURL)
  if (!failedAtPublicGw && (state.pubGwURLString || state.pubSubdomainGwURL)) {
    const publicUrl = await ipfsPathValidator.resolveToPublicUrl(url)
    if (publicUrl && publicUrl.startsWith('http')) return publicUrl
  }
  if (state.localGwAvailable && state.nodeActive) return ipfsPathValidator.resolveToLocalUrl(url)
  return null
}

// The URL a failed request is recovered to: a loadable gateway URL when one
// exists, otherwise the extension's recovery page with the native URI in the
// hash, where the user can start a local node or install IPFS Desktop.
async function recoveryUrlForFailedRequest (request, state, ipfsPathValidator, runtimeRoot) {
  const gatewayUrl = await resolveToActiveGatewayUrl(request.url, state, ipfsPathValidator)
  if (gatewayUrl) return gatewayUrl
  const nativeUri = ipfsPathValidator.resolveToNativeUri(request.url)
  if (nativeUri && nativeUri.startsWith('ip')) {
    return `${dropSlash(runtimeRoot)}${recoveryPagePath}#${encodeURIComponent(nativeUri)}`
  }
  return null
}

// Recovery check for onErrorOccurred (request.error) and onCompleted (request.statusCode)
async function isRecoverable (request, state, ipfsPathValidator) {
  const { error, statusCode, url } = request
  return (state.recoverFailedHttpRequests &&
    request.type === 'main_frame' &&
    (recoverableNetworkErrors.has(error) ||
      recoverableHttpError(statusCode)) &&
    await ipfsPathValidator.publicIpfsOrIpnsResource(url))
}

// Recovery check for onErrorOccurred (request.error)
function isRecoverableViaDNSLink (request, state, dnslinkResolver) {
  const recoverableViaDnslink =
    state.recoverFailedHttpRequests &&
    request.type === 'main_frame' &&
    state.dnslinkRedirect &&
    recoverableNetworkErrors.has(request.error)
  return recoverableViaDnslink && dnslinkResolver.canLookupURL(request.url)
}

// Recovery check for onErrorOccurred (request.error)
function isRecoverableViaEthDNS (request, state) {
  return state.recoverFailedHttpRequests &&
    request.type === 'main_frame' &&
    recoverableNetworkErrors.has(request.error) &&
    new URL(request.url).hostname.endsWith('.eth')
}

// We can't redirect in onErrorOccurred/onCompleted
// Indead, we recover by opening URL in a new tab that replaces the failed one
// TODO: display an user-friendly prompt when the very first recovery is done
async function updateTabWithURL (request, redirectUrl, browser) {
  // Do nothing if the URL remains the same
  if (request.url === redirectUrl) return

  return browser.tabs.update(request.tabId, {
    active: true,
    url: redirectUrl
  })
}
