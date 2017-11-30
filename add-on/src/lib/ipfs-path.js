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
    publicIpfsOrIpnsResource (url) {
      // first, exclude gateway and api, otherwise we have infinite loop
      if (!url.startsWith(getState().gwURLString) && !url.startsWith(getState().apiURLString)) {
        // /ipfs/ is easy to validate, we just check if CID is correct and return if true
        if (IsIpfs.ipfsUrl(url)) {
          return true
        }
        // /ipns/ requires multiple stages/branches, as it can be FQDN with dnslink or CID
        if (IsIpfs.ipnsUrl(url) && validIpnsPath(new URL(url).pathname, dnsLink)) {
          return true
        }
      }
      // everything else is not ipfs-related
      return false
    },

    validIpfsOrIpnsPath (path) {
      return IsIpfs.ipfsPath(path) || validIpnsPath(path, dnsLink)
    },

    isIpfsPageActionsContext (url) {
      return IsIpfs.url(url) && !url.startsWith(getState().apiURLString)
    }
  }

  return ipfsPathValidator
}

exports.createIpfsPathValidator = createIpfsPathValidator

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
