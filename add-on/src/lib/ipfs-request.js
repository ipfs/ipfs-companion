'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:request')
log.error = debug('ipfs-companion:request:error')

const LRU = require('lru-cache')
const IsIpfs = require('is-ipfs')
const isFQDN = require('is-fqdn')
const { pathAtHttpGateway } = require('./ipfs-path')

const redirectOptOutHint = 'x-ipfs-companion-no-redirect'
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
const recoverableHttpError = (code) => code && code >= 400

// Tracking late redirects for edge cases such as https://github.com/ipfs-shipyard/ipfs-companion/issues/436
const onHeadersReceivedRedirect = new Set()

// Request modifier provides event listeners for the various stages of making an HTTP request
// API Details: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest
function createRequestModifier (getState, dnslinkResolver, ipfsPathValidator, runtime) {
  const browser = runtime.browser
  const runtimeRoot = browser.runtime.getURL('/')
  const webExtensionOrigin = runtimeRoot ? new URL(runtimeRoot).origin : 'null'

  // Various types of requests are identified once and cached across all browser.webRequest hooks
  const requestCacheCfg = { max: 128, maxAge: 1000 * 30 }
  const recoveredTabs = new LRU(requestCacheCfg)
  const ignoredRequests = new LRU(requestCacheCfg)
  const ignore = (id) => ignoredRequests.set(id, true)
  const isIgnored = (id) => ignoredRequests.get(id) !== undefined
  const errorInFlight = new LRU({ max: 3, maxAge: 1000 })

  const acrhHeaders = new LRU(requestCacheCfg) // webui cors fix in Chrome
  const originUrls = new LRU(requestCacheCfg) // request.originUrl workaround for Chrome
  const originUrl = (request) => {
    // Firefox and Chrome provide relevant value in different fields:
    // (Firefox) request object includes full URL of origin document, return as-is
    if (request.originUrl) return request.originUrl
    // (Chrome) is lacking: `request.initiator` is just the origin (protocol+hostname+port)
    // To reconstruct originUrl we read full URL from Referer header in onBeforeSendHeaders
    // and cache it for short time
    // TODO: when request.originUrl is available in Chrome the `originUrls` cache can be removed
    const cachedUrl = originUrls.get(request.requestId)
    if (cachedUrl) return cachedUrl
    if (request.requestHeaders) {
      const referer = request.requestHeaders.find(h => h.name === 'Referer')
      if (referer) {
        originUrls.set(request.requestId, referer.value)
        return referer.value
      }
    }
  }

  const preNormalizationSkip = (state, request) => {
    // skip requests to the custom gateway or API (otherwise we have too much recursion)
    if (request.url.startsWith(state.gwURLString) || request.url.startsWith(state.apiURLString)) {
      ignore(request.requestId)
    }
    // skip websocket handshake (not supported by HTTP2IPFS gateways)
    if (request.type === 'websocket') {
      ignore(request.requestId)
    }
    // skip all local requests
    if (request.url.startsWith('http://127.0.0.1') || request.url.startsWith('http://localhost') || request.url.startsWith('http://[::1]')) {
      ignore(request.requestId)
    }
    // skip if a per-site opt-out exists
    const parentUrl = request.originUrl || request.initiator // FF: originUrl (Referer-like Origin URL), Chrome: initiator (just Origin)
    const fqdn = new URL(request.url).hostname
    const parentFqdn = parentUrl && parentUrl !== 'null' && request.url !== parentUrl ? new URL(parentUrl).hostname : null
    if (state.noIntegrationsHostnames.some(optout =>
      fqdn !== 'gateway.ipfs.io' && (fqdn.endsWith(optout) || (parentFqdn && parentFqdn.endsWith(optout))
      ))) {
      ignore(request.requestId)
    }
    // additional checks limited to requests for root documents
    if (request.type === 'main_frame') {
      // lazily trigger DNSLink lookup (will do anything only if status for root domain is not in cache)
      if (state.dnslinkPolicy && dnslinkResolver.canLookupURL(request.url)) {
        dnslinkResolver.resolve(request.url) // no await: preload record in background
      }
    }
    return isIgnored(request.requestId)
  }

  const postNormalizationSkip = (state, request) => {
    // skip requests to the public gateway if embedded node is running (otherwise we have too much recursion)
    if (state.ipfsNodeType === 'embedded' && request.url.startsWith(state.pubGwURLString)) {
      ignore(request.requestId)
      // TODO: do not skip and redirect to `ipfs://` and `ipns://` if hasNativeProtocolHandler === true
    }
    return isIgnored(request.requestId)
  }

  // Build RequestModifier
  return {
    // browser.webRequest.onBeforeRequest
    // This event is triggered when a request is about to be made, and before headers are available.
    // This is a good place to listen if you want to cancel or redirect the request.
    onBeforeRequest (request) {
      const state = getState()
      if (!state.active) return
      // early sanity checks
      if (preNormalizationSkip(state, request)) {
        return
      }
      // poor-mans protocol handlers - https://github.com/ipfs/ipfs-companion/issues/164#issuecomment-328374052
      if (state.catchUnhandledProtocols && mayContainUnhandledIpfsProtocol(request)) {
        const fix = normalizedUnhandledIpfsProtocol(request, state.pubGwURLString)
        if (fix) {
          return fix
        }
      }
      // handler for protocol_handlers from manifest.json
      if (redirectingProtocolRequest(request)) {
        // fix path passed via custom protocol
        const fix = normalizedRedirectingProtocolRequest(request, state.pubGwURLString)
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
        if (ipfsPathValidator.publicIpfsOrIpnsResource(request.url) && isSafeToRedirect(request, runtime)) {
          return redirectToGateway(request.url, state, ipfsPathValidator)
        }
        // Detect dnslink using heuristics enabled in Preferences
        if (state.dnslinkPolicy && dnslinkResolver.canLookupURL(request.url)) {
          if (state.dnslinkRedirect) {
            const dnslinkRedirect = dnslinkResolver.dnslinkRedirect(request.url)
            if (dnslinkRedirect && isSafeToRedirect(request, runtime)) {
              // console.log('onBeforeRequest.dnslinkRedirect', dnslinkRedirect)
              return dnslinkRedirect
            }
          } else if (state.dnslinkDataPreload) {
            dnslinkResolver.preloadData(request.url)
          }
          if (state.dnslinkPolicy === 'best-effort') {
            dnslinkResolver.resolve(request.url)
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
      if (request.url.startsWith(state.apiURLString)) {
        // Requests made by 'blessed' Web UI
        // --------------------------------------------
        // Goal: Web UI works without setting CORS at go-ipfs
        // (Without this snippet go-ipfs will return HTTP 403 due to additional origin check on the backend)
        const origin = originUrl(request)
        if (origin && origin.startsWith(state.webuiRootUrl)) {
          // console.log('onBeforeSendHeaders', request)
          // console.log('onBeforeSendHeaders.origin', origin)
          // Swap Origin to pass server-side check
          // (go-ipfs returns HTTP 403 on origin mismatch if there are no CORS headers)
          const swapOrigin = (at) => {
            request.requestHeaders[at].value = request.requestHeaders[at].value.replace(state.gwURL.origin, state.apiURL.origin)
          }
          let foundAt = request.requestHeaders.findIndex(h => h.name === 'Origin')
          if (foundAt > -1) swapOrigin(foundAt)
          foundAt = request.requestHeaders.findIndex(h => h.name === 'Referer')
          if (foundAt > -1) swapOrigin(foundAt)

          // Save access-control-request-headers from preflight
          foundAt = request.requestHeaders.findIndex(h => h.name && h.name.toLowerCase() === 'access-control-request-headers')
          if (foundAt > -1) {
            acrhHeaders.set(request.requestId, request.requestHeaders[foundAt].value)
            // console.log('onBeforeSendHeaders FOUND access-control-request-headers', acrhHeaders.get(request.requestId))
          }
          // console.log('onBeforeSendHeaders fixed headers', request.requestHeaders)
        }

        // '403 - Forbidden' fix for Chrome and Firefox
        // --------------------------------------------
        // We remove Origin header from requests made to API URL and WebUI
        // by js-ipfs-http-client running in WebExtension context to remove need
        // for manual CORS whitelisting via Access-Control-Allow-Origin at go-ipfs
        // More info:
        // Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/622
        // Chromium 71: https://github.com/ipfs-shipyard/ipfs-companion/pull/616
        // Chromium 72: https://github.com/ipfs-shipyard/ipfs-companion/issues/630
        const isWebExtensionOrigin = (origin) => {
          // console.log(`origin=${origin}, webExtensionOrigin=${webExtensionOrigin}`)
          // Chromium <= 71 returns opaque Origin as defined in
          // https://html.spec.whatwg.org/multipage/origin.html#ascii-serialisation-of-an-origin
          if (origin == null || origin === 'null') {
            return true
          }
          // Firefox  Nightly 65 sets moz-extension://{extension-installation-id}
          // Chromium Beta    72 sets chrome-extension://{uid}
          if (origin &&
            (origin.startsWith('moz-extension://') ||
              origin.startsWith('chrome-extension://')) &&
                new URL(origin).origin === webExtensionOrigin) {
            return true
          }
          return false
        }

        // Remove Origin header matching webExtensionOrigin
        const foundAt = request.requestHeaders.findIndex(h => h.name === 'Origin' && isWebExtensionOrigin(h.value))
        if (foundAt > -1) request.requestHeaders.splice(foundAt, 1)

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
          for (const header of request.requestHeaders) {
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
            request.requestHeaders.push(expectHeader)
          }
        }
      }
      return {
        requestHeaders: request.requestHeaders
      }
    },

    // browser.webRequest.onHeadersReceived
    // Fired when the HTTP response headers associated with a request have been received.
    // You can use this event to modify HTTP response headers or do a very late redirect.
    onHeadersReceived (request) {
      const state = getState()
      if (!state.active) return

      // Special handling of requests made to API
      if (request.url.startsWith(state.apiURLString)) {
        // Special handling of requests made by 'blessed' Web UI from local Gateway
        // Goal: Web UI works without setting CORS at go-ipfs
        // (This includes 'ignored' requests: CORS needs to be fixed even if no redirect is done)
        const origin = originUrl(request)
        if (origin && origin.startsWith(state.webuiRootUrl) && request.responseHeaders) {
          // console.log('onHeadersReceived', request)
          const acaOriginHeader = { name: 'Access-Control-Allow-Origin', value: state.gwURL.origin }
          const foundAt = findHeaderIndex(acaOriginHeader.name, request.responseHeaders)
          if (foundAt > -1) {
            request.responseHeaders[foundAt].value = acaOriginHeader.value
          } else {
            request.responseHeaders.push(acaOriginHeader)
          }

          // Restore access-control-request-headers from preflight
          const acrhValue = acrhHeaders.get(request.requestId)
          if (acrhValue) {
            const acahHeader = { name: 'Access-Control-Allow-Headers', value: acrhValue }
            const foundAt = findHeaderIndex(acahHeader.name, request.responseHeaders)
            if (foundAt > -1) {
              request.responseHeaders[foundAt].value = acahHeader.value
            } else {
              request.responseHeaders.push(acahHeader)
            }
            acrhHeaders.del(request.requestId)
            // console.log('onHeadersReceived SET  Access-Control-Allow-Headers', header)
          }

          // console.log('onHeadersReceived fixed headers', request.responseHeaders)
          return { responseHeaders: request.responseHeaders }
        }
      }

      // Skip if request is marked as ignored
      if (isIgnored(request.requestId)) {
        return
      }

      if (state.redirect) {
        // Late redirect as a workaround for edge cases such as:
        // - CORS XHR in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
        if (runtime.requiresXHRCORSfix && onHeadersReceivedRedirect.has(request.requestId)) {
          onHeadersReceivedRedirect.delete(request.requestId)
          if (state.dnslinkPolicy) {
            const dnslinkRedirect = dnslinkResolver.dnslinkRedirect(request.url)
            if (dnslinkRedirect) {
              return dnslinkRedirect
            }
          }
          return redirectToGateway(request.url, state, ipfsPathValidator)
        }

        // Detect X-Ipfs-Path Header and upgrade transport to IPFS:
        // 1. Check if DNSLink exists and redirect to it.
        // 2. If there is no DNSLink, validate path from the header and redirect
        const url = request.url
        const notActiveGatewayOrApi = !(url.startsWith(state.pubGwURLString) || url.startsWith(state.gwURLString) || url.startsWith(state.apiURLString))
        if (state.detectIpfsPathHeader && request.responseHeaders && notActiveGatewayOrApi) {
          // console.log('onHeadersReceived.request', request)
          for (const header of request.responseHeaders) {
            if (header.name.toLowerCase() === 'x-ipfs-path' && isSafeToRedirect(request, runtime)) {
              // console.log('onHeadersReceived.request.responseHeaders', request.responseHeaders.length)
              const xIpfsPath = header.value
              // First: Check if dnslink heuristic yields any results
              // Note: this depends on which dnslink lookup policy is selecten in Preferences
              if (state.dnslinkRedirect && state.dnslinkPolicy && dnslinkResolver.canLookupURL(request.url)) {
                // x-ipfs-path is a strong indicator of IPFS support
                // so we force dnslink lookup to pre-populate dnslink cache
                // in a way that works even when state.dnslinkPolicy !== 'enabled'
                // All the following requests will be upgraded to IPNS
                const cachedDnslink = dnslinkResolver.readAndCacheDnslink(new URL(request.url).hostname)
                const dnslinkRedirect = dnslinkResolver.dnslinkRedirect(request.url, cachedDnslink)
                if (dnslinkRedirect) {
                  log(`onHeadersReceived: dnslinkRedirect from ${request.url} to ${dnslinkRedirect.redirectUrl}`)
                  return dnslinkRedirect
                }
              }
              // Additional validation of X-Ipfs-Path
              if (IsIpfs.ipnsPath(xIpfsPath)) {
                // Ignore unhandled IPNS path by this point
                // (means DNSLink is disabled so we don't want to make a redirect that works like DNSLink)
                // log(`onHeadersReceived: ignoring x-ipfs-path=${xIpfsPath} (dnslinkRedirect=false, dnslinkPolicy=false or missing DNS TXT record)`)
              } else if (IsIpfs.ipfsPath(xIpfsPath)) {
                // It is possible that someone exposed /ipfs/<cid>/ under /
                // and our path-based onBeforeRequest heuristics were unable
                // to identify request as IPFS one until onHeadersReceived revealed
                // presence of x-ipfs-path header.
                // Solution: convert header value to a path at public gateway
                // (optional redirect to custom one can happen later)
                const url = new URL(request.url)
                const pathWithArgs = `${xIpfsPath}${url.search}${url.hash}`
                const newUrl = pathAtHttpGateway(pathWithArgs, state.pubGwURLString)
                // redirect only if anything changed
                if (newUrl !== request.url) {
                  log(`onHeadersReceived: normalized ${request.url} to  ${newUrl}`)
                  return redirectToGateway(newUrl, state, ipfsPathValidator)
                }
              }
            }
          }
        }
      }
    },

    // browser.webRequest.onErrorOccurred
    // Fired when a request could not be processed due to an error on network level.
    // For example: TCP timeout, DNS lookup failure
    // NOTE: this is executed only if webRequest.ResourceType='main_frame'
    onErrorOccurred (request) {
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
        const redirect = { redirectUrl: url.toString() }
        log(`onErrorOccurred: attempting to recover from DNS error (${request.error}) using EthDNS for ${request.url} → ${redirect.redirectUrl}`, request)
        return createTabWithURL(redirect, browser, recoveredTabs)
      }

      // Check if error can be recovered via DNSLink
      if (isRecoverableViaDNSLink(request, state, dnslinkResolver)) {
        const { hostname } = new URL(request.url)
        const dnslink = dnslinkResolver.readAndCacheDnslink(hostname)
        if (dnslink) {
          const redirect = dnslinkResolver.dnslinkRedirect(request.url, dnslink)
          log(`onErrorOccurred: attempting to recover from network error (${request.error}) using dnslink for ${request.url} → ${redirect.redirectUrl}`, request)
          return createTabWithURL(redirect, browser, recoveredTabs)
        }
      }

      // Cleanup after https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      if (runtime.requiresXHRCORSfix && onHeadersReceivedRedirect.has(request.requestId)) {
        onHeadersReceivedRedirect.delete(request.requestId)
      }

      // Check if error can be recovered by opening same content-addresed path
      // using active gateway (public or local, depending on redirect state)
      if (isRecoverable(request, state, ipfsPathValidator)) {
        let redirectUrl
        // if subdomain request redirect to default public subdomain url
        if (ipfsPathValidator.ipfsOrIpnsSubdomain(request.url)) {
          redirectUrl = ipfsPathValidator.resolveToPublicSubdomainUrl(request.url, state.pubSubdomainGwURL)
        } else {
          redirectUrl = ipfsPathValidator.resolveToPublicUrl(request.url, state.pubGwURLString)
        }
        log(`onErrorOccurred: attempting to recover from network error (${request.error}) for ${request.url} → ${redirectUrl}`, request)
        return createTabWithURL({ redirectUrl }, browser, recoveredTabs)
      }
    },

    // browser.webRequest.onCompleted
    // Fired when HTTP request is completed (successfully or with an error code)
    // NOTE: this is executed only if webRequest.ResourceType='main_frame'
    onCompleted (request) {
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
        setTimeout(() => browser.tabs.update({ url: fixedUrl }), 1000)

        return browser.tabs.update({ url: fixedUrl })
      }

      let redirectUrl
      if (isRecoverable(request, state, ipfsPathValidator)) {
        // if subdomain request redirect to default public subdomain url
        if (ipfsPathValidator.ipfsOrIpnsSubdomain(request.url)) {
          redirectUrl = ipfsPathValidator.resolveToPublicSubdomainUrl(request.url, state.pubSubdomainGwURL)
        } else {
          redirectUrl = ipfsPathValidator.resolveToPublicUrl(request.url, state.pubGwURLString)
        }
        log(`onCompleted: attempting to recover from HTTP Error ${request.statusCode} for ${request.url} → ${redirectUrl}`, request)
        return createTabWithURL({ redirectUrl }, browser, recoveredTabs)
      }
    }
  }
}

exports.redirectOptOutHint = redirectOptOutHint
exports.createRequestModifier = createRequestModifier

function redirectToGateway (requestUrl, state, ipfsPathValidator) {
  // TODO: redirect to `ipfs://` if hasNativeProtocolHandler === true
  const gateway = state.ipfsNodeType === 'embedded' ? state.pubGwURLString : state.gwURLString
  const redirectUrl = ipfsPathValidator.resolveToPublicUrl(requestUrl, gateway)
  return { redirectUrl }
}

function isSafeToRedirect (request, runtime) {
  // Do not redirect if URL includes opt-out hint
  if (request.url.includes('x-ipfs-companion-no-redirect')) {
    return false
  }

  // For now we do not redirect if cid-in-subdomain is used
  // as it would break origin-based security perimeter
  if (IsIpfs.subdomain(request.url)) {
    return false
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
  return true
}

// REDIRECT-BASED PROTOCOL HANDLERS
// This API is available only Firefox (protocol_handlers from manifest.json)
// Background: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-282513891
// Notes on removal of web+ in Firefox 59: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-355708883
// ===================================================================

// This is just a placeholder that we had to provide -- removed in normalizedRedirectingProtocolRequest()
// It has to match URL from manifest.json/protocol_handlers
const redirectingProtocolEndpoint = 'https://gateway.ipfs.io/ipfs/bafkreiewrj2pugsghd3flw2lk2fhvtmz6wipecnxep5qc5m3lfpf2mvjk4#'

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
  path = fixupDnslinkPath(path) // /ipfs/example.com → /ipns/example.com
  if (oldPath !== path && IsIpfs.path(path)) {
    return { redirectUrl: pathAtHttpGateway(path, pubGwUrl) }
  }
  return null
}

// idempotent /ipfs/example.com → /ipns/example.com
function fixupDnslinkPath (path) {
  if (!(path && path.startsWith('/ipfs/'))) return path
  const [, root] = path.match(/^\/ipfs\/([^/?#]+)/)
  if (root && !IsIpfs.cid(root) && isFQDN(root)) {
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
    return IsIpfs.path(unhandledPath) ? unhandledPath : `/${unhandledProtocol}${unhandledPath}`
  }
  return null
}

function normalizedUnhandledIpfsProtocol (request, pubGwUrl) {
  let path = unhandledIpfsPath(request.url)
  path = fixupDnslinkPath(path) // /ipfs/example.com → /ipns/example.com
  if (IsIpfs.path(path)) {
    // replace search query with a request to a public gateway
    // (will be redirected later, if needed)
    return { redirectUrl: pathAtHttpGateway(path, pubGwUrl) }
  }
}

function findHeaderIndex (name, headers) {
  return headers.findIndex(x => x.name && x.name.toLowerCase() === name.toLowerCase())
}

// RECOVERY OF FAILED REQUESTS
// ===================================================================

// Recovery check for onErrorOccurred (request.error) and onCompleted (request.statusCode)
function isRecoverable (request, state, ipfsPathValidator) {
  return state.recoverFailedHttpRequests &&
    request.type === 'main_frame' &&
    (recoverableNetworkErrors.has(request.error) || recoverableHttpError(request.statusCode)) &&
    (ipfsPathValidator.publicIpfsOrIpnsResource(request.url) || ipfsPathValidator.ipfsOrIpnsSubdomain(request.url)) &&
    !request.url.startsWith(state.pubGwURLString) && !request.url.includes(state.pubSubdomainGwURL.hostname)
}

// Recovery check for onErrorOccurred (request.error)
function isRecoverableViaDNSLink (request, state, dnslinkResolver) {
  const recoverableViaDnslink =
    state.recoverFailedHttpRequests &&
    request.type === 'main_frame' &&
    state.dnslinkPolicy &&
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
async function createTabWithURL (redirect, browser, recoveredTabs) {
  const tabKey = redirect.redirectUrl
  // reuse existing tab, if exists
  // (this avoids duplicated tabs - https://github.com/ipfs-shipyard/ipfs-companion/issues/805)
  try {
    const recoveredId = recoveredTabs.get(tabKey)
    const existingTab = recoveredId ? await browser.tabs.get(recoveredId) : undefined
    if (existingTab) {
      await browser.tabs.update(recoveredId, { active: true })
      return
    }
  } catch (_) {
    // tab no longer exist, let's create a new one
  }
  const failedTab = await browser.tabs.getCurrent()
  const openerTabId = failedTab ? failedTab.id : undefined
  const newTab = await browser.tabs.create({
    active: true,
    openerTabId,
    url: redirect.redirectUrl
  })
  if (newTab) recoveredTabs.set(tabKey, newTab.id)
}
