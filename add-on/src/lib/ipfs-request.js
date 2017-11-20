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

    // poor-mans protocol handlers - https://github.com/ipfs/ipfs-companion/issues/164#issuecomment-328374052
    if (state.catchUnhandledProtocols && mayContainUnhandledIpfsProtocol(request)) {
      const fix = normalizedUnhandledIpfsProtocol(request, state.pubGwURLString)
      if (fix) {
        return fix
      }
    }

    // handler for protocol_handlers from manifest.json
    if (webPlusProtocolRequest(request)) {
      // fix path passed via custom protocol
      const fix = normalizedWebPlusRequest(request, state.pubGwURLString)
      if (fix) {
        return fix
      }
    }

    // handle redirects to custom gateway
    if (state.redirect) {
      // Ignore preload requests
      if (request.method === 'HEAD' && state.preloadAtPublicGateway && request.url.startsWith(state.pubGwURLString)) {
        return
      }
      // Detect valid /ipfs/ and /ipns/ on any site
      if (ipfsPathValidator.publicIpfsOrIpnsResource(request.url)) {
        return redirectToCustomGateway(request.url, state.gwURL)
      }
      // Look for dnslink in TXT records of visited sites
      if (state.dnslink && dnsLink.isDnslookupSafeForURL(request.url)) {
        return dnsLink.dnslinkLookupAndOptionalRedirect(request.url)
      }
    }
  }
}

exports.createRequestModifier = createRequestModifier

function redirectToCustomGateway (requestUrl, gwUrl) {
  const url = new URL(requestUrl)
  url.protocol = gwUrl.protocol
  url.host = gwUrl.host
  url.port = gwUrl.port
  return { redirectUrl: url.toString() }
}

// PROTOCOL HANDLERS: web+ in Firefox (protocol_handlers from manifest.json)
// ===================================================================

const webPlusProtocolHandler = 'https://ipfs.io/web%2B'

function webPlusProtocolRequest (request) {
  return request.url.startsWith(webPlusProtocolHandler)
}

function normalizedWebPlusRequest (request, pubGwUrl) {
  const oldPath = decodeURIComponent(new URL(request.url).pathname)
  let path = oldPath
  path = path.replace(/^\/web\+dweb:\//i, '/') // web+dweb:/ipfs/Qm → /ipfs/Qm
  path = path.replace(/^\/web\+ipfs:\/\//i, '/ipfs/') // web+ipfs://Qm → /ipfs/Qm
  path = path.replace(/^\/web\+ipns:\/\//i, '/ipns/') // web+ipns://Qm → /ipns/Qm
  if (oldPath !== path && IsIpfs.path(path)) {
    return { redirectUrl: urlAtPublicGw(path, pubGwUrl) }
  }
  return null
}

// PROTOCOL HANDLERS: UNIVERSAL FALLBACK FOR UNHANDLED PROTOCOLS
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
