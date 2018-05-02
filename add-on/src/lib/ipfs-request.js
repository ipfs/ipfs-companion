'use strict'
/* eslint-env browser */

const IsIpfs = require('is-ipfs')
const { urlAtPublicGw } = require('./ipfs-path')

function createRequestModifier (getState, dnsLink, ipfsPathValidator) {
  return function modifyRequest (request) {
    const state = getState()

    // skip requests to the custom gateway or API (otherwise we have too much recursion)
    if (request.url.startsWith(state.gwURLString) || request.url.startsWith(state.apiURLString)) {
      return
    }

    // skip websocket handshake (not supported by HTTP2IPFS gateways)
    if (request.type === 'websocket') {
      return
    }

    // skip all local requests
    if (request.url.startsWith('http://127.0.0.1:') || request.url.startsWith('http://localhost:') || request.url.startsWith('http://[::1]:')) {
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

    // skip requests to the public gateway if embedded node is running (otherwise we have too much recursion)
    if (state.ipfsNodeType === 'embedded' && request.url.startsWith(state.pubGwURLString)) {
      return
      // TODO: do not skip and redirect to `ipfs://` and `ipns://` if hasNativeProtocolHandler === true
    }

    // handle redirects to custom gateway
    if (state.redirect) {
      // Ignore preload requests
      if (request.method === 'HEAD' && state.preloadAtPublicGateway && request.url.startsWith(state.pubGwURLString)) {
        return
      }
      // Detect valid /ipfs/ and /ipns/ on any site
      if (ipfsPathValidator.publicIpfsOrIpnsResource(request.url)) {
        return redirectToGateway(request.url, state)
      }
      // Look for dnslink in TXT records of visited sites
      if (state.dnslink && dnsLink.isDnslookupSafeForURL(request.url)) {
        return dnsLink.dnslinkLookupAndOptionalRedirect(request.url)
      }
    }
  }
}

exports.createRequestModifier = createRequestModifier

function redirectToGateway (requestUrl, state) {
  // TODO: redirect to `ipfs://` if hasNativeProtocolHandler === true
  const gwUrl = state.ipfsNodeType === 'embedded' ? state.pubGwURL : state.gwURL
  const url = new URL(requestUrl)
  url.protocol = gwUrl.protocol
  url.host = gwUrl.host
  url.port = gwUrl.port
  return { redirectUrl: url.toString() }
}

// REDIRECT-BASED PROTOCOL HANDLERS
// This API is available only Firefox (protocol_handlers from manifest.json)
// Background: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-282513891
// Notes on removal of web+ in Firefox 59: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-355708883
// ===================================================================

// This is just a placeholder that we had to provide -- removed in normalizedRedirectingProtocolRequest()
const redirectingProtocolHandler = 'https://ipfs.io/#redirect/'

function redirectingProtocolRequest (request) {
  return request.url.startsWith(redirectingProtocolHandler)
}

function normalizedRedirectingProtocolRequest (request, pubGwUrl) {
  const oldPath = decodeURIComponent(new URL(request.url).hash)
  let path = oldPath
  // prefixed (Firefox < 59)
  path = path.replace(/^#redirect\/web\+dweb:\//i, '/') // web+dweb:/ipfs/Qm → /ipfs/Qm
  path = path.replace(/^#redirect\/web\+ipfs:\/\//i, '/ipfs/') // web+ipfs://Qm → /ipfs/Qm
  path = path.replace(/^#redirect\/web\+ipns:\/\//i, '/ipns/') // web+ipns://Qm → /ipns/Qm
  // without prefix (Firefox >= 59)
  path = path.replace(/^#redirect\/dweb:\//i, '/') // dweb:/ipfs/Qm → /ipfs/Qm
  path = path.replace(/^#redirect\/ipfs:\/\//i, '/ipfs/') // ipfs://Qm → /ipfs/Qm
  path = path.replace(/^#redirect\/ipns:\/\//i, '/ipns/') // ipns://Qm → /ipns/Qm
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
