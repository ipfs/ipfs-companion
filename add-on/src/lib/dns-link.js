'use strict'
/* eslint-env browser */

const IsIpfs = require('is-ipfs')
const { LRUMap } = require('lru_map')

module.exports = function createDnsLink (getState) {
  const cache = new LRUMap(1000)

  const dnsLink = {
    isDnslookupPossible () {
      // DNS lookups require IPFS API to be up
      // and have a confirmed connection to the internet
      return getState().peerCount > 0
    },

    isDnslookupSafeForURL (requestUrl) {
      // skip URLs that could produce infinite recursion or weird loops
      return dnsLink.isDnslookupPossible() &&
        requestUrl.startsWith('http') &&
        !IsIpfs.url(requestUrl) &&
        !requestUrl.startsWith(getState().apiURLString) &&
        !requestUrl.startsWith(getState().gwURLString)
    },

    dnslinkLookupAndOptionalRedirect (requestUrl) {
      const url = new URL(requestUrl)
      const fqdn = url.hostname
      const dnslink = dnsLink.cachedDnslinkLookup(fqdn)
      if (dnslink) {
        // redirect to IPNS and leave it up to the gateway
        // to load the correct path from IPFS
        // - https://github.com/ipfs/ipfs-companion/issues/298
        return dnsLink.redirectToIpnsPath(url)
      }
    },

    cachedDnslinkLookup (fqdn) {
      let dnslink = cache.get(fqdn)
      if (typeof dnslink === 'undefined') {
        try {
          console.info('dnslink cache miss for: ' + fqdn)
          dnslink = dnsLink.readDnslinkFromTxtRecord(fqdn)
          if (dnslink) {
            cache.set(fqdn, dnslink)
            console.info(`Resolved dnslink: '${fqdn}' -> '${dnslink}'`)
          } else {
            cache.set(fqdn, false)
            console.info(`Resolved NO dnslink for '${fqdn}'`)
          }
        } catch (error) {
          console.error(`Error in dnslinkLookupAndOptionalRedirect for '${fqdn}'`)
          console.error(error)
        }
      } else {
        console.info(`Resolved via cached dnslink: '${fqdn}' -> '${dnslink}'`)
      }
      return dnslink
    },

    readDnslinkFromTxtRecord (fqdn) {
      // js-ipfs-api does not provide method for fetching this
      // TODO: revisit after https://github.com/ipfs/js-ipfs-api/issues/501 is addressed
      const apiCall = `${getState().apiURLString}api/v0/dns/${fqdn}`
      const xhr = new XMLHttpRequest() // older XHR API us used because window.fetch appends Origin which causes error 403 in go-ipfs
      // synchronous mode with small timeout
      // (it is okay, because we do it only once, then it is cached and read via cachedDnslinkLookup)
      xhr.open('GET', apiCall, false)
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.send(null)
      if (xhr.status === 200) {
        const dnslink = JSON.parse(xhr.responseText).Path
        // console.log('readDnslinkFromTxtRecord', readDnslinkFromTxtRecord)
        if (!IsIpfs.path(dnslink)) {
          throw new Error(`dnslink for '${fqdn}' is not a valid IPFS path: '${dnslink}'`)
        }
        return dnslink
      } else if (xhr.status === 500) {
        // go-ipfs returns 500 if host has no dnslink
        // TODO: find/fill an upstream bug to make this more intuitive
        return false
      } else {
        throw new Error(xhr.statusText)
      }
    },

    redirectToIpnsPath (originalUrl) {
      // TODO: redirect to `ipns://` if hasNativeProtocolHandler === true
      const fqdn = originalUrl.hostname
      const state = getState()
      const gwUrl = state.ipfsNodeType === 'embedded' ? state.pubGwURL : state.gwURL
      const url = new URL(originalUrl)
      url.protocol = gwUrl.protocol
      url.host = gwUrl.host
      url.port = gwUrl.port
      url.pathname = `/ipns/${fqdn}${url.pathname}`
      return { redirectUrl: url.toString() }
    }
  }

  return dnsLink
}
