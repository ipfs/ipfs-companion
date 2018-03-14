'use strict'
/* eslint-env browser */

const IsIpfs = require('is-ipfs')

function safeIpfsPath (urlOrPath) {
  // better safe than sorry: https://github.com/ipfs/ipfs-companion/issues/303
  return decodeURIComponent(urlOrPath.replace(/^.*(\/ip(f|n)s\/.+)$/, '$1'))
}

exports.safeIpfsPath = safeIpfsPath

function urlAtPublicGw (path, pubGwUrl) {
  return new URL(`${pubGwUrl}${path}`).toString().replace(/([^:]\/)\/+/g, '$1')
}

exports.urlAtPublicGw = urlAtPublicGw

function createIpfsPathValidator (getState, dnsLink) {
  const ipfsPathValidator = {
    // Test if URL is a Public IPFS resource
    // (pass validIpfsOrIpnsUrl(url) and not at the local gateway or API)
    publicIpfsOrIpnsResource (url) {
      // exclude custom gateway and api, otherwise we have infinite loops
      if (!url.startsWith(getState().gwURLString) && !url.startsWith(getState().apiURLString)) {
        return validIpfsOrIpnsUrl(url, dnsLink)
      }
      return false
    },

    // Test if URL is a valid IPFS or IPNS
    // (IPFS needs to be a CID, IPNS can be PeerId or have dnslink entry)
    validIpfsOrIpnsUrl (url) {
      return validIpfsOrIpnsUrl(url, dnsLink)
    },

    // Same as validIpfsOrIpnsUrl (url) but for paths
    // (we have separate methods to avoid 'new URL' where possible)
    validIpfsOrIpnsPath (path) {
      return validIpfsOrIpnsPath(path, dnsLink)
    },

    // Test if actions such as 'copy URL', 'pin/unpin' should be enabled for the URL
    // (we explicitly disable IPNS for now as there is no support for pins)
    isIpfsPageActionsContext (url) {
      return IsIpfs.url(url) && !url.startsWith(getState().apiURLString)
    }
  }

  return ipfsPathValidator
}

exports.createIpfsPathValidator = createIpfsPathValidator

function validIpfsOrIpnsUrl (url, dnsLink) {
  // `/ipfs/` is easy to validate, we just check if CID is correct
  if (IsIpfs.ipfsUrl(url)) {
    return true
  }
  // `/ipns/` requires multiple stages/branches (can be FQDN with dnslink or CID)
  if (validIpnsPath(new URL(url).pathname, dnsLink)) {
    return true
  }
  // everything else is not IPFS-related
  return false
}

function validIpfsOrIpnsPath (path, dnsLink) {
  // `/ipfs/` is easy to validate, we just check if CID is correct
  if (IsIpfs.ipfsPath(path)) {
    return true
  }
  // `/ipns/` requires multiple stages/branches (can be FQDN with dnslink or CID)
  if (validIpnsPath(path, dnsLink)) {
    return true
  }
  // everything else is not IPFS-related
  return false
}

function validIpnsPath (path, dnsLink) {
  if (IsIpfs.ipnsPath(path)) {
    // we may have false-positives here, so we do additional checks below
    const ipnsRoot = path.match(/^\/ipns\/([^/]+)/)[1]
    // console.log('==> IPNS root', ipnsRoot)
    // first check if root is a regular CID
    if (IsIpfs.cid(ipnsRoot)) {
      // console.log('==> IPNS is a valid CID', ipnsRoot)
      return true
    }
    if (dnsLink.isDnslookupPossible() && dnsLink.cachedDnslinkLookup(ipnsRoot)) {
      // console.log('==> IPNS for FQDN with valid dnslink: ', ipnsRoot)
      return true
    }
  }
  return false
}
