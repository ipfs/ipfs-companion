'use strict'
/* eslint-env browser */

const debug = require('debug')
const log = debug('ipfs-companion:dnslink')
log.error = debug('ipfs-companion:dnslink:error')

const IsIpfs = require('is-ipfs')
const LRU = require('lru-cache')
const { default: PQueue } = require('p-queue')
const { offlinePeerCount } = require('./state')
const { ipfsContentPath, sameGateway, pathAtHttpGateway } = require('./ipfs-path')

module.exports = function createDnslinkResolver (getState) {
  // DNSLink lookup result cache
  const cacheOptions = { max: 1000, maxAge: 1000 * 60 * 60 * 12 }
  const cache = new LRU(cacheOptions)
  // upper bound for concurrent background lookups done by resolve(url)
  const lookupQueue = new PQueue({ concurrency: 4 })
  // preload of DNSLink data
  const preloadUrlCache = new LRU(cacheOptions)
  const preloadQueue = new PQueue({ concurrency: 4 })

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
        !sameGateway(requestUrl, state.apiURL) &&
        !sameGateway(requestUrl, state.gwURL)
    },

    dnslinkAtGateway (url, dnslink) {
      if (typeof url === 'string') {
        url = new URL(url)
      }
      if (dnslinkResolver.canRedirectToIpns(url, dnslink)) {
        const state = getState()
        // redirect to IPNS and leave it up to the gateway
        // to load the correct path from IPFS
        // - https://github.com/ipfs/ipfs-companion/issues/298
        const ipnsPath = dnslinkResolver.convertToIpnsPath(url)
        const gateway = state.redirect && state.localGwAvailable ? state.gwURLString : state.pubGwURLString
        return pathAtHttpGateway(ipnsPath, gateway)
      }
    },

    readAndCacheDnslink (fqdn) {
      let dnslink = dnslinkResolver.cachedDnslink(fqdn)
      if (typeof dnslink === 'undefined') {
        try {
          log(`dnslink cache miss for '${fqdn}', running DNS TXT lookup`)
          dnslink = dnslinkResolver.readDnslinkFromTxtRecord(fqdn)
          if (dnslink) {
            // TODO: set TTL as maxAge: setDnslink(fqdn, dnslink, maxAge)
            dnslinkResolver.setDnslink(fqdn, dnslink)
            log(`found dnslink: '${fqdn}' -> '${dnslink}'`)
          } else {
            dnslinkResolver.setDnslink(fqdn, false)
            log(`found NO dnslink for '${fqdn}'`)
          }
        } catch (error) {
          log.error(`error in readAndCacheDnslink for '${fqdn}'`, error)
        }
      } else {
        // Most of the time we will hit cache, which makes below line is too noisy
        // console.info(`[ipfs-companion] using cached dnslink: '${fqdn}' -> '${dnslink}'`)
      }
      return dnslink
    },

    // runs async lookup in a queue in the background and returns the record
    async resolve (url) {
      if (!dnslinkResolver.canLookupURL(url)) return
      const fqdn = new URL(url).hostname
      const cachedResult = dnslinkResolver.cachedDnslink(fqdn)
      if (cachedResult) return cachedResult
      return lookupQueue.add(() => {
        return dnslinkResolver.readAndCacheDnslink(fqdn)
      })
    },

    // preloads data behind the url to local node
    async preloadData (url) {
      const state = getState()
      if (!state.dnslinkDataPreload || state.dnslinkRedirect) return
      if (preloadUrlCache.get(url)) return
      preloadUrlCache.set(url, true)
      const dnslink = await dnslinkResolver.resolve(url)
      if (!dnslink) return
      if (!state.localGwAvailable) return
      if (state.peerCount < 1) return
      return preloadQueue.add(async () => {
        const { pathname } = new URL(url)
        const preloadUrl = new URL(state.gwURLString)
        preloadUrl.pathname = `${dnslink}${pathname}`
        await fetch(preloadUrl.toString(), { method: 'HEAD' })
        return preloadUrl
      })
    },

    // low level lookup without cache
    readDnslinkFromTxtRecord (fqdn) {
      const state = getState()
      let apiProvider
      if (!state.ipfsNodeType.startsWith('embedded') && state.peerCount !== offlinePeerCount) {
        // Use gw port so it can be a GET:
        // Chromium does not execute onBeforeSendHeaders for synchronous calls
        // made from the same extension context as onBeforeSendHeaders
        // which means we are unable to fixup Origin on the fly for this
        // This will no longer be needed when we switch
        // to async lookup via ipfs.dns everywhere
        apiProvider = state.gwURLString
      } else {
        // fallback to resolver at public gateway
        apiProvider = 'https://ipfs.io/'
      }
      // js-ipfs-api does not provide method for fetching this
      // TODO: revisit after https://github.com/ipfs/js-ipfs-api/issues/501 is addressed
      // TODO: consider worst-case-scenario fallback to https://developers.google.com/speed/public-dns/docs/dns-over-https
      const apiCall = `${apiProvider}api/v0/name/resolve/${fqdn}?r=false`
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
      return `/ipns/${url.hostname}${url.pathname}${url.search}${url.hash}`
    },

    // Test if URL contains a valid DNSLink FQDN
    // in url.hostname OR in url.pathname (/ipns/<fqdn>)
    // and return matching FQDN if present
    findDNSLinkHostname (url) {
      if (!url) return
      // Normalize subdomain and path gateways to to /ipns/<fqdn>
      const contentPath = ipfsContentPath(url)
      if (IsIpfs.ipnsPath(contentPath)) {
        // we may have false-positives here, so we do additional checks below
        const ipnsRoot = contentPath.match(/^\/ipns\/([^/]+)/)[1]
        // console.log('findDNSLinkHostname ==> inspecting IPNS root', ipnsRoot)
        // Ignore PeerIDs, match DNSLink only
        if (!IsIpfs.cid(ipnsRoot) && dnslinkResolver.readAndCacheDnslink(ipnsRoot)) {
          // console.log('findDNSLinkHostname ==> found DNSLink for FQDN in url.pathname: ', ipnsRoot)
          return ipnsRoot
        }
      }
      // Check main hostname
      const { hostname } = new URL(url)
      if (dnslinkResolver.readAndCacheDnslink(hostname)) {
        // console.log('findDNSLinkHostname ==> found DNSLink for url.hostname', hostname)
        return hostname
      }
    }

  }

  return dnslinkResolver
}
