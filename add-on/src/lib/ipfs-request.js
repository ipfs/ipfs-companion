'use strict'
/* eslint-env browser, webextensions */

const IsIpfs = require('is-ipfs')
const { safeIpfsPath, pathAtHttpGateway } = require('./ipfs-path')
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

function createRequestModifier (getState, dnslinkResolver, ipfsPathValidator, runtime) {
  // Request modifier provides event listeners for the various stages of making an HTTP request
  // API Details: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest
  const browser = runtime.browser
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
          return redirectToGateway(request.url, state, dnslinkResolver)
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
        // More info (ipfs-companion): https://github.com/ipfs-shipyard/ipfs-companion/issues/480
        // More info (go-ipfs): https://github.com/ipfs/go-ipfs/issues/5168
        if (request.url.includes('/api/v0/add') && request.url.includes('stream-channels=true')) {
          let addExpectHeader = true
          const expectHeader = { name: 'Expect', value: '100-continue' }
          const warningMsg = '[ipfs-companion] Executing "Expect: 100-continue" workaround for ipfs.files.add due to https://github.com/ipfs/go-ipfs/issues/5168'
          for (let header of request.requestHeaders) {
            // Workaround A: https://github.com/ipfs/go-ipfs/issues/5168#issuecomment-401417420
            // (works in Firefox, but Chromium does not expose Connection header)
            /* (disabled so we use the workaround B in all browsers)
            if (header.name === 'Connection' && header.value !== 'close') {
              console.warn('[ipfs-companion] Executing "Connection: close" workaround for ipfs.files.add due to https://github.com/ipfs/go-ipfs/issues/5168')
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
                console.log(warningMsg)
                header.value = expectHeader.value
              }
              break
            }
          }
          if (addExpectHeader) {
            console.log(warningMsg)
            request.requestHeaders.push(expectHeader)
          }
        }
        // For some reason js-ipfs-api sent requests with "Origin: null" under Chrome
        // which produced '403 - Forbidden' error.
        // This workaround removes bogus header from API requests
        // TODO: check if still necessary
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
      const state = getState()

      if (state.active && state.redirect) {
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
          return redirectToGateway(request.url, state, dnslinkResolver)
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
              console.log(`[ipfs-companion] detected x-ipfs-path for ${request.url}: ${xIpfsPath}`)
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
                  console.log(`[ipfs-companion] onHeadersReceived: dnslinkRedirect from ${request.url} to ${dnslinkRedirect.redirectUrl}`)
                  return dnslinkRedirect
                }
              }
              // Additional validation of X-Ipfs-Path
              if (IsIpfs.ipnsPath(xIpfsPath)) {
                // Ignore unhandled IPNS path by this point
                // (means DNSLink is disabled so we don't want to make a redirect that works like DNSLink)
                console.log(`[ipfs-companion] onHeadersReceived: ignoring x-ipfs-path=${xIpfsPath} (dnslinkPolicy=false or missing DNS TXT record)`)
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
                  console.log(`[ipfs-companion] onHeadersReceived: normalized ${request.url} to  ${newUrl}`)
                  return redirectToGateway(newUrl, state, dnslinkResolver)
                }
              }
            }
          }
        }
      }
    },

    async onErrorOccurred (request) {
      // Fired when a request could not be processed due to an error:
      // for example, a lack of Internet connectivity.
      const state = getState()

      if (state.active) {
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
            console.log(`[ipfs-companion] onErrorOccurred: recovering using dnslink for ${request.url}`, dnslinkRedirect)
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

function redirectToGateway (requestUrl, state, dnslinkResolver) {
  // TODO: redirect to `ipfs://` if hasNativeProtocolHandler === true
  const gateway = state.ipfsNodeType === 'embedded' ? state.pubGwURLString : state.gwURLString
  const path = safeIpfsPath(requestUrl)
  return { redirectUrl: pathAtHttpGateway(path, gateway) }
}

function isSafeToRedirect (request, runtime) {
  // Do not redirect if URL includes opt-out hint
  if (request.url.includes('x-ipfs-companion-no-redirect')) {
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
