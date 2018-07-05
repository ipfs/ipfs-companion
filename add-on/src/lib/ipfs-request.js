'use strict'
/* eslint-env browser, webextensions */

const IsIpfs = require('is-ipfs')
const { urlAtPublicGw } = require('./ipfs-path')
const redirectOptOutHint = 'x-ipfs-companion-no-redirect'

// Tracking late redirects for edge cases such as https://github.com/ipfs-shipyard/ipfs-companion/issues/436
const onHeadersReceivedRedirect = new Set()

function createRequestModifier (getState, dnsLink, ipfsPathValidator, runtime) {
  // Request modifier provides event listeners for the various stages of making an HTTP request
  // API Details: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest
  return {
    onBeforeRequest (request) {
      // This event is triggered when a request is about to be made, and before headers are available.
      // This is a good place to listen if you want to cancel or redirect the request.
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
          return redirectToGateway(request.url, state, dnsLink)
        }
        // Look for dnslink in TXT records of visited sites
        if (state.dnslink && dnsLink.isDnslookupSafeForURL(request.url)) {
          const dnslinkRedirect = dnsLink.dnslinkLookupAndOptionalRedirect(request.url)
          if (dnslinkRedirect && isSafeToRedirect(request, runtime)) {
            return dnslinkRedirect
          }
        }
      }
    },

    onBeforeSendHeaders (request) {
      // This event is triggered before sending any HTTP data, but after all HTTP headers are available.
      // This is a good place to listen if you want to modify HTTP request headers.
      const state = getState()
      // ignore websocket handshake (not supported by HTTP2IPFS gateways)
      if (request.type === 'websocket') {
        return
      }
      if (request.url.startsWith(state.apiURLString)) {
        // There is a bug in go-ipfs related to keep-alive connections
        // that results in partial response for ipfs.files.add
        // mangled by error "http: invalid Read on closed Body"
        // More info: https://github.com/ipfs/go-ipfs/issues/5168
        if (request.url.includes('/api/v0/add')) {
          for (let header of request.requestHeaders) {
            if (header.name === 'Connection') {
              console.warn('[ipfs-companion] Executing "Connection: close" workaround for ipfs.files.add due to https://github.com/ipfs/go-ipfs/issues/5168')
              header.value = 'close'
              break
            }
          }
        }
        // For some reason js-ipfs-api sent requests with "Origin: null" under Chrome
        // which produced '403 - Forbidden' error.
        // This workaround removes bogus header from API requests
        for (let i = 0; i < request.requestHeaders.length; i++) {
          let header = request.requestHeaders[i]
          if (header.name === 'Origin' && (header.value == null || header.value === 'null')) {
            request.requestHeaders.splice(i, 1)
            break
          }
        }
      }
      return {
        requestHeaders: request.requestHeaders
      }
    },

    onHeadersReceived (request) {
      // Fired when the HTTP response headers associated with a request have been received.
      // You can use this event to modify HTTP response headers or do a very late redirect.

      // Late redirect as a workaround for edge cases such as:
      // - CORS XHR in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      if (onHeadersReceivedRedirect.has(request.requestId)) {
        const state = getState()
        onHeadersReceivedRedirect.delete(request.requestId)
        return redirectToGateway(request.url, state, dnsLink)
      }
    },

    onErrorOccurred (request) {
      // Fired when a request could not be processed due to an error:
      // for example, a lack of Internet connectivity.

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

// types of requests to be skipped before any normalization happens
function preNormalizationSkip (state, request) {
  // skip requests to the custom gateway or API (otherwise we have too much recursion)
  if (request.url.startsWith(state.gwURLString) || request.url.startsWith(state.apiURLString)) {
    return true
  }

  // skip websocket handshake (not supported by HTTP2IPFS gateways)
  if (request.type === 'websocket') {
    return true
  }

  // skip all local requests
  if (request.url.startsWith('http://127.0.0.1:') || request.url.startsWith('http://localhost:') || request.url.startsWith('http://[::1]:')) {
    return true
  }

  return false
}

// types of requests to be skipped after expensive normalization happens
function postNormalizationSkip (state, request) {
  // skip requests to the public gateway if embedded node is running (otherwise we have too much recursion)
  if (state.ipfsNodeType === 'embedded' && request.url.startsWith(state.pubGwURLString)) {
    return true
    // TODO: do not skip and redirect to `ipfs://` and `ipns://` if hasNativeProtocolHandler === true
  }

  return false
}

function redirectToGateway (requestUrl, state, dnsLink) {
  // TODO: redirect to `ipfs://` if hasNativeProtocolHandler === true
  const url = new URL(requestUrl)
  if (state.dnslink && dnsLink.canRedirectToIpns(url)) {
    // late dnslink in onHeadersReceived
    return dnsLink.redirectToIpnsPath(url)
  }
  const gwUrl = state.ipfsNodeType === 'embedded' ? state.pubGwURL : state.gwURL
  url.protocol = gwUrl.protocol
  url.host = gwUrl.host
  url.port = gwUrl.port
  return { redirectUrl: url.toString() }
}

function isSafeToRedirect (request, runtime) {
  // Do not redirect if URL includes opt-out hint
  if (request.url.includes('x-ipfs-companion-no-redirect')) {
    return false
  }

  // Ignore XHR requests for which redirect would fail due to CORS bug in Firefox
  // See: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
  // TODO: revisit when upstream bug is addressed
  if (runtime.isFirefox && request.type === 'xmlhttprequest') {
    // Sidenote on XHR Origin: Firefox 60 uses request.originUrl, Chrome 63 uses request.initiator
    if (request.originUrl) {
      const sourceOrigin = new URL(request.originUrl).origin
      const targetOrigin = new URL(request.url).origin
      if (sourceOrigin !== targetOrigin) {
        console.warn('[ipfs-companion] Delaying redirect of CORS XHR until onHeadersReceived due to https://github.com/ipfs-shipyard/ipfs-companion/issues/436 :', request.url)
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
    return { redirectUrl: urlAtPublicGw(path, pubGwUrl) }
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
    return { redirectUrl: urlAtPublicGw(path, pubGwUrl) }
  }
}
