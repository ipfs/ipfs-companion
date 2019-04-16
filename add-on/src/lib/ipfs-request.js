'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:request')
log.error = debug('ipfs-companion:request:error')

const LRU = require('lru-cache')
const IsIpfs = require('is-ipfs')
const { pathAtHttpGateway } = require('./ipfs-path')
const redirectOptOutHint = 'x-ipfs-companion-no-redirect'
const recoverableErrors = new Set([
  // Firefox
  'NS_ERROR_NET_TIMEOUT', // eg. httpd is offline
  'NS_ERROR_NET_RESET', // failed to load because the server kept reseting the connection
  'NS_ERROR_NET_ON_RESOLVED', // no network
  // Chrome
  'net::ERR_CONNECTION_TIMED_OUT', // eg. httpd is offline
  'net::ERR_INTERNET_DISCONNECTED' // no network
])

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
  const ignoredRequests = new LRU(requestCacheCfg)
  const ignore = (id) => ignoredRequests.set(id, true)
  const isIgnored = (id) => ignoredRequests.get(id) !== undefined

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
    let cachedUrl = originUrls.get(request.requestId)
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
    // skip if a per-site redirect opt-out exists
    const parentUrl = request.originUrl || request.initiator // FF: originUrl (Referer-like Origin URL), Chrome: initiator (just Origin)
    const fqdn = new URL(request.url).hostname
    const parentFqdn = parentUrl && parentUrl !== 'null' && request.url !== parentUrl ? new URL(parentUrl).hostname : null
    if (state.noRedirectHostnames.some(optout =>
      fqdn.endsWith(optout) || (parentFqdn && parentFqdn.endsWith(optout)
      ))) {
      ignore(request.requestId)
    }
    // additional checks limited to requests for root documents
    if (request.type === 'main_frame') {
      // lazily trigger DNSLink lookup (will do anything only if status for root domain is not in cache)
      if (state.dnslinkPolicy && dnslinkResolver.canLookupURL(request.url)) {
        dnslinkResolver.preloadDnslink(request.url)
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
      if (state.active && state.redirect) {
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
          const dnslinkRedirect = dnslinkResolver.dnslinkRedirect(request.url)
          if (dnslinkRedirect && isSafeToRedirect(request, runtime)) {
            // console.log('onBeforeRequest.dnslinkRedirect', dnslinkRedirect)
            return dnslinkRedirect
          }
          if (state.dnslinkPolicy === 'best-effort') {
            // dnslinkResolver.preloadDnslink(request.url, (dnslink) => console.log(`---> preloadDnslink(${new URL(request.url).hostname})=${dnslink}`))
            dnslinkResolver.preloadDnslink(request.url)
          }
        }
      }
    },

    // browser.webRequest.onBeforeSendHeaders
    // This event is triggered before sending any HTTP data, but after all HTTP headers are available.
    // This is a good place to listen if you want to modify HTTP request headers.
    onBeforeSendHeaders (request) {
      const state = getState()

      // Skip if IPFS integrations are inactive
      if (!state.active) {
        return
      }

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
          for (let header of request.requestHeaders) {
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

      // Skip if IPFS integrations are inactive
      if (!state.active) {
        return
      }

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
        if (onHeadersReceivedRedirect.has(request.requestId)) {
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
          for (let header of request.responseHeaders) {
            if (header.name.toLowerCase() === 'x-ipfs-path' && isSafeToRedirect(request, runtime)) {
              // console.log('onHeadersReceived.request.responseHeaders', request.responseHeaders.length)
              const xIpfsPath = header.value
              log(`detected x-ipfs-path for ${request.url}: ${xIpfsPath}`)
              // First: Check if dnslink heuristic yields any results
              // Note: this depends on which dnslink lookup policy is selecten in Preferences
              if (state.dnslinkPolicy && dnslinkResolver.canLookupURL(request.url)) {
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
                log(`onHeadersReceived: ignoring x-ipfs-path=${xIpfsPath} (dnslinkPolicy=false or missing DNS TXT record)`)
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
    // Fired when a request could not be processed due to an error:
    // for example, a lack of Internet connectivity.
    async onErrorOccurred (request) {
      const state = getState()

      // Skip if IPFS integrations are inactive or request is marked as ignored
      if (!state.active || isIgnored(request.requestId)) {
        return
      }

      // console.log('onErrorOccurred:' + request.error)
      // console.log('onErrorOccurred', request)
      // Check if error is final and can be recovered via DNSLink
      const recoverableViaDnslink =
        state.dnslinkPolicy &&
        request.type === 'main_frame' &&
        recoverableErrors.has(request.error)
      if (recoverableViaDnslink && dnslinkResolver.canLookupURL(request.url)) {
        // Explicit call to ignore global DNSLink policy and force DNS TXT lookup
        const cachedDnslink = dnslinkResolver.readAndCacheDnslink(new URL(request.url).hostname)
        const dnslinkRedirect = dnslinkResolver.dnslinkRedirect(request.url, cachedDnslink)
        // We can't redirect in onErrorOccurred, so if DNSLink is present
        // recover by opening IPNS version in a new tab
        // TODO: add tests and demo
        if (dnslinkRedirect) {
          log(`onErrorOccurred: recovering using dnslink for ${request.url}`, dnslinkRedirect)
          const currentTabId = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0].id)
          await browser.tabs.create({
            active: true,
            openerTabId: currentTabId,
            url: dnslinkRedirect.redirectUrl
          })
        }
      }

      // Cleanup after https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      if (onHeadersReceivedRedirect.has(request.requestId)) {
        onHeadersReceivedRedirect.delete(request.requestId)
      }
    }

  }
}

exports.redirectOptOutHint = redirectOptOutHint
exports.createRequestModifier = createRequestModifier
exports.onHeadersReceivedRedirect = onHeadersReceivedRedirect

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
  // TODO: revisit when upstream bug is addressed
  if (runtime.isFirefox && request.type === 'xmlhttprequest' && !request.responseHeaders) {
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
const redirectingProtocolEndpoint = 'https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#'

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
  // console.log(`oldPath: '${oldPath}' new: '${path}'`)
  if (oldPath !== path && IsIpfs.path(path)) {
    return { redirectUrl: pathAtHttpGateway(path, pubGwUrl) }
  }
  return null
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
  const path = unhandledIpfsPath(request.url)
  if (IsIpfs.path(path)) {
    // replace search query with fake request to the public gateway
    // (will be redirected later, if needed)
    return { redirectUrl: pathAtHttpGateway(path, pubGwUrl) }
  }
}

function findHeaderIndex (name, headers) {
  return headers.findIndex(x => x.name && x.name.toLowerCase() === name.toLowerCase())
}
