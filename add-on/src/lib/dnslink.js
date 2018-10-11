'use strict'
/* eslint-env browser */

const IsIpfs = require('is-ipfs')
const LRU = require('lru-cache')
const PQueue = require('p-queue')
const { offlinePeerCount } = require('./state')
const { pathAtHttpGateway } = require('./ipfs-path')

module.exports = function createDnslinkResolver (getState) {
  // DNSLink lookup result cache
  const cacheOptions = { max: 1000, maxAge: 1000 * 60 * 60 * 12 }
  const cache = new LRU(cacheOptions)
  // upper bound for concurrent background lookups done by preloadDnslink(url)
  const lookupQueue = new PQueue({ concurrency: 8 })

  const dnslinkResolver = {

    get _cache () {
      return cache
    },

    setDnslink (fqdn, value) {
      cache.set(fqdn, value)
    },

    clearCache () {
      cache.reset()
    },

    cachedDnslink (fqdn) {
      return cache.get(fqdn)
    },

    canLookupURL (requestUrl) {
      // skip URLs that could produce infinite recursion or weird loops
      const state = getState()
      return state.dnslinkPolicy &&
        requestUrl.startsWith('http') &&
        !IsIpfs.url(requestUrl) &&
        !requestUrl.startsWith(state.apiURLString) &&
        !requestUrl.startsWith(state.gwURLString)
    },

    dnslinkRedirect (url, dnslink) {
      if (typeof url === 'string') {
        url = new URL(url)
      }
      if (dnslinkResolver.canRedirectToIpns(url, dnslink)) {
        const state = getState()
        // redirect to IPNS and leave it up to the gateway
        // to load the correct path from IPFS
        // - https://github.com/ipfs/ipfs-companion/issues/298
        const ipnsPath = dnslinkResolver.convertToIpnsPath(url)
        const gateway = state.ipfsNodeType === 'embedded' ? state.pubGwURLString : state.gwURLString
        // TODO: redirect to `ipns://` if hasNativeProtocolHandler === true
        return { redirectUrl: pathAtHttpGateway(ipnsPath, gateway) }
      }
    },

    readAndCacheDnslink (fqdn) {
      let dnslink = dnslinkResolver.cachedDnslink(fqdn)
      if (typeof dnslink === 'undefined') {
        try {
          console.info(`[ipfs-companion] dnslink cache miss for '${fqdn}', running DNS TXT lookup`)
          dnslink = dnslinkResolver.readDnslinkFromTxtRecord(fqdn)
          if (dnslink) {
            // TODO: set TTL as maxAge: setDnslink(fqdn, dnslink, maxAge)
            dnslinkResolver.setDnslink(fqdn, dnslink)
            console.info(`[ipfs-companion] found dnslink: '${fqdn}' -> '${dnslink}'`)
          } else {
            dnslinkResolver.setDnslink(fqdn, false)
            console.info(`[ipfs-companion] found NO dnslink for '${fqdn}'`)
          }
        } catch (error) {
          console.error(`[ipfs-companion] Error in readAndCacheDnslink for '${fqdn}'`)
          console.error(error)
        }
      } else {
        // Most of the time we will hit cache, which makes below line is too noisy
        // console.info(`[ipfs-companion] using cached dnslink: '${fqdn}' -> '${dnslink}'`)
      }
      return dnslink
    },

    // does not return anything, runs async lookup in the background
    // and saves result into cache with an optional callback
    preloadDnslink (url, cb) {
      if (dnslinkResolver.canLookupURL(url)) {
        lookupQueue.add(async () => {
          const fqdn = new URL(url).hostname
          const result = dnslinkResolver.readAndCacheDnslink(fqdn)
          if (cb) {
            cb(result)
          }
        })
      } else if (cb) {
        cb(null)
      }
    },

    // low level lookup without cache
    readDnslinkFromTxtRecord (fqdn) {
      const state = getState()
      let apiProvider
      if (state.ipfsNodeType === 'external' && state.peerCount !== offlinePeerCount) {
        apiProvider = state.apiURLString
      } else {
        // fallback to resolver at public gateway
        apiProvider = 'https://ipfs.io/'
      }
      // js-ipfs-api does not provide method for fetching this
      // TODO: revisit after https://github.com/ipfs/js-ipfs-api/issues/501 is addressed
      // TODO: consider worst-case-scenario fallback to https://developers.google.com/speed/public-dns/docs/dns-over-https
      const apiCall = `${apiProvider}api/v0/dns/${fqdn}?r=true`
      const xhr = new XMLHttpRequest() // older XHR API us used because window.fetch appends Origin which causes error 403 in go-ipfs
      // synchronous mode with small timeout
      // (it is okay, because we do it only once, then it is cached and read via readAndCacheDnslink)
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
        // go-ipfs returns 500 if host has no dnslink or an error occurred
        // TODO: find/fill an upstream bug to make this more intuitive
        return false
      } else {
        throw new Error(xhr.statusText)
      }
    },

    canRedirectToIpns (url, dnslink) {
      if (typeof url === 'string') {
        url = new URL(url)
      }
      // Safety check: detect and skip gateway paths
      // Public gateways such as ipfs.io are often exposed under the same domain name.
      // We don't want dnslink to interfere with content-addressing redirects,
      // or things like /api/v0 paths exposed by the writable gateway
      // so we ignore known namespaces exposed by HTTP2IPFS gateways
      // and ignore them even if things like CID are invalid
      // -- we don't want to skew errors from gateway
      const path = url.pathname
      const httpGatewayPath = path.startsWith('/ipfs/') || path.startsWith('/ipns/') || path.startsWith('/api/v')
      if (!httpGatewayPath) {
        const fqdn = url.hostname
        // If dnslink policy is 'enabled' then lookups will be
        // executed for every unique hostname on every visited website.
        // Until we get efficient DNS TXT Lookup API there will be an overhead,
        // so 'enabled' policy is an opt-in for now.  By default we use
        // 'best-effort' policy which does async lookups to populate dnslink cache
        // in the background and do blocking lookup only when X-Ipfs-Path header
        // is found in initial response.
        // More: https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/dnslink.md
        const foundDnslink = dnslink ||
          (getState().dnslinkPolicy === 'enabled'
            ? dnslinkResolver.readAndCacheDnslink(fqdn)
            : dnslinkResolver.cachedDnslink(fqdn))
        if (foundDnslink) {
          return true
        }
      }
      return false
    },

    convertToIpnsPath (url) {
      if (typeof url === 'string') {
        url = new URL(url)
      }
      const fqdn = url.hostname
      return `/ipns/${fqdn}${url.pathname}${url.search}${url.hash}`
    }

  }

  return dnslinkResolver
}
