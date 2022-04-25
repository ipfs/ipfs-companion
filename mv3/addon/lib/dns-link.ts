// dns resolver
/*
DNSResolver needs to accept a domain:
  - first lookup to see if domain is in ruleset, if it is return
  - if not a dns domain, then return early
  - if dns domain, add to declarativeNetRequest
*/

/*
 * a note on caching:
 * The caching in this file is a remnant of the dnslink resolver mv2
 * version. Since we are storing all of the results within the DeclarativeNetRequest
 * api's dynamic rules, we may not need to keep them. I'd like to review
 * the access times of the dynamicRuleset and possibly remove the cache
 * dependencies in the future.
 *
 */

import debug from "debug";
import browser from "webextension-polyfill";
import QuickLRU from "quick-lru";
import PQueue from "p-queue";
import IsIpfs from "is-ipfs";

import { ipfsContentPath, pathAtHttpGateway, sameGateway } from "./ipfs-path";

const log = debug("ipfs-companion:dnslink");
log.error = debug("ipfs-companion:dnslink:error");

const check = String.fromCodePoint(0x2714);

export default function createDnslinkResolver(getState, ipfs) {
  // DNSLink lookup result cache
  const cacheOptions = { maxSize: 1000, maxAge: 1000 * 60 * 60 * 12 };
  const cache = new QuickLRU(cacheOptions);
  // upper bound for concurrent background lookups done by resolve(url)
  const lookupQueue = new PQueue({ concurrency: 4 });
  // preload of DNSLink data
  // const preloadUrlCache = new QuickLRU(cacheOptions)
  // const preloadQueue = new PQueue({ concurrency: 4 })

  const dnslinkResolver = {
    get _cache() {
      return cache;
    },

    setDnslink(fqdn, value) {
      cache.set(fqdn, value);
    },

    clearCache() {
      cache.clear();
    },

    hasCachedDnslink(fqdn) {
      return cache.has(fqdn);
    },

    cachedDnslink(fqdn) {
      return cache.get(fqdn);
    },

    canLookupURL(requestUrl) {
      // skip URLs that could produce infinite recursion or weird loops
      const state = getState();
      return (
        requestUrl.startsWith("http") &&
        !IsIpfs.url(requestUrl) &&
        !sameGateway(requestUrl, state.apiURL) &&
        !sameGateway(requestUrl, state.gwURL)
      );
    },

    // CURRENTLY UNUSED, https://github.com/ipfs/ipfs-companion/blob/41171b3a84212279518dc1329766c4ac62efbff4/add-on/src/lib/ipfs-request.js 4 matches here
    // dnslinkAtGateway (url, dnslink) {
    //   if (typeof url === 'string') {
    //     url = new URL(url)
    //   }
    //   if (dnslinkResolver.canRedirectToIpns(url, dnslink)) {
    //     const state = getState()
    //     // redirect to IPNS and leave it up to the gateway
    //     // to load the correct path from IPFS
    //     // - https://github.com/ipfs/ipfs-companion/issues/298
    //     const ipnsPath = dnslinkResolver.convertToIpnsPath(url)
    //     const gateway = state.redirect && state.localGwAvailable ? state.gwURLString : state.pubGwURLString
    //     return pathAtHttpGateway(ipnsPath, gateway)
    //   }
    // },

    async readAndCacheDnslink(fqdn) {
      let dnslink = await dnslinkResolver.cachedDnslink(fqdn);
      if (typeof dnslink === "undefined") {
        try {
          log(`dnslink cache miss for '${fqdn}', running DNS TXT lookup`);
          dnslink = dnslinkResolver.resolveFqdn(fqdn);
          dnslinkResolver.addRuleToDynamicRuleset(fqdn);
          if (dnslink) {
            // TODO: set TTL as maxAge: setDnslink(fqdn, dnslink, maxAge)
            dnslinkResolver.setDnslink(fqdn, dnslink);
            log(`found dnslink: '${fqdn}' -> '${dnslink}'`);
          } else {
            dnslinkResolver.setDnslink(fqdn, false);
            log(`found NO dnslink for '${fqdn}'`);
          }
        } catch (error) {
          log.error(`error in readAndCacheDnslink for '${fqdn}'`, error);
        }
      } else {
        // Most of the time we will hit cache, which makes below line is too noisy
        // console.info(`[ipfs-companion] using cached dnslink: '${fqdn}' -> '${dnslink}'`)
      }
      return dnslink;
    },

    async getXIPFSPATHHeader (fqdn) {
      let xIpfsPath;
      // TODO: fix up this url in a safer way
      await fetch('https://' + fqdn, {
        method: 'GET',
      }).then(response => {
        if (response.headers.has('x-ipfs-path')) {
          xIpfsPath = response.headers.get('x-ipfs-path')
        }
      }).catch(error => console.log('Error:', error));

      if (xIpfsPath) {
        // Additional validation of X-Ipfs-Path
        if (IsIPFS.ipnsPath(xIpfsPath)) {
          // Ignore unhandled IPNS path by this point
          // (means DNSLink is disabled so we don't want to make a redirect that works like DNSLink)
          // log(`onHeadersReceived: ignoring x-ipfs-path=${xIpfsPath} (dnslinkRedirect=false, dnslinkPolicy=false or missing DNS TXT record)`)
        } else if (IsIPFS.ipfsPath(xIpfsPath)) {
          // It is possible that someone exposed /ipfs/<cid>/ under /
          // and our path-based onBeforeRequest heuristics were unable
          // to identify request as IPFS one until onHeadersReceived revealed
          // presence of x-ipfs-path header.
          // Solution: convert header value to a path at public gateway
          // (optional redirect to custom one can happen later)
          const url = new URL('https://' + fqdn);
          const pathWithArgs = `${xIpfsPath}${url.search}${url.hash}`;
          const state = getState();
          const newUrl = pathAtHttpGateway(pathWithArgs, state.pubGwURLString);
          // redirect only if local node is around
          if (newUrl && state.localGwAvailable) {
            log(`onHeadersReceived: normalized ${fqdn} to  ${newUrl}`);
            // return redirectToGateway(request, newUrl, state, ipfsPathValidator, runtime)
          }
          return newUrl;
        }
      }
      return xIpfsPath;
    },

    // runs async lookup in a queue in the background and returns the record
    async resolve(url) {
      if (!dnslinkResolver.canLookupURL(url)) return;
      const fqdn = new URL(url).hostname;
      const cachedResult = await dnslinkResolver.cachedDnslink(fqdn);
      if (cachedResult) return cachedResult;
      return lookupQueue.add(() => {
        return dnslinkResolver.readAndCacheDnslink(fqdn);
      });
    },

    // preloads data behind the url to local node
    // async preloadData (url) {
    //   const state = getState()
    //   if (!state.dnslinkDataPreload || state.dnslinkRedirect) return
    //   if (preloadUrlCache.get(url)) return
    //   preloadUrlCache.set(url, true)
    //   const dnslink = await dnslinkResolver.resolve(url)
    //   if (!dnslink) return
    //   if (!state.localGwAvailable) return
    //   if (state.peerCount < 1) return
    //   return preloadQueue.add(async () => {
    //     const { pathname } = new URL(url)
    //     const preloadUrl = new URL(state.gwURLString)
    //     preloadUrl.pathname = `${dnslink}${pathname}`
    //     await fetch(preloadUrl.toString(), { method: 'HEAD' })
    //     return preloadUrl
    //   })
    // },

    async resolveFqdn(fqdn) {
      const contentPath = await ipfs.resolve(`/ipns/${fqdn}`);
      if (!contentPath) return contentPath;
      if (!IsIpfs.path(contentPath)) {
        throw new Error(
          `dnslink for '${fqdn}' is not a valid IPFS path: '${contentPath}'`
        );
      }
      return contentPath;
    },

    convertToIpnsPath(url) {
      if (typeof url === "string") {
        url = new URL(url);
      }
      return `/ipns/${url.hostname}${url.pathname}${url.search}${url.hash}`;
    },

    // Test if URL contains a valid DNSLink FQDN
    // in url.hostname OR in url.pathname (/ipns/<fqdn>)
    // and return matching FQDN if present
    findDNSLinkHostname(url) {
      if (!url) return;
      // Normalize subdomain and path gateways to to /ipns/<fqdn>
      const contentPath = ipfsContentPath(url);
      if (IsIpfs.ipnsPath(contentPath)) {
        // we may have false-positives here, so we do additional checks below
        const ipnsRoot = contentPath.match(/^\/ipns\/([^/]+)/)[1];
        // console.log('findDNSLinkHostname ==> inspecting IPNS root', ipnsRoot)
        // Ignore PeerIDs, match DNSLink only
        if (
          !IsIpfs.cid(ipnsRoot) &&
          dnslinkResolver.readAndCacheDnslink(ipnsRoot)
        ) {
          // console.log('findDNSLinkHostname ==> found DNSLink for FQDN in url.pathname: ', ipnsRoot)
          return ipnsRoot;
        }
      }
      // Check main hostname
      const { hostname } = new URL(url);
      if (dnslinkResolver.readAndCacheDnslink(hostname)) {
        // console.log('findDNSLinkHostname ==> found DNSLink for url.hostname', hostname)
        return hostname;
      }
    },

    async addRuleToDynamicRuleset(domain) {
      const contentPath = await dnslinkResolver.resolveFqdn(domain);
      if (!contentPath) return;

      const id = Math.floor(Math.random() * 29999);
      // TODO(DJ): need to add error handling for collisions
      await browser.declarativeNetRequest.updateDynamicRules(
        {
          addRules: [
            {
              id,
              priority: 1,
              action: {
                type: "redirect",
                redirect: { url: `https://dweb.link${contentPath}` },
              },
              condition: { urlFilter: domain, resourceTypes: ["main_frame"] },
            },
          ],
        },
        () => {
          dnslinkResolver.setDnslink(domain, contentPath);
          console.log(
            `Added rule ${id}, contentPath: ${contentPath}, domain: ${domain}. Will redirect to ipfs gateway on next page load ${check}`
          );
        }
      );
    },

    async getDynamicRuleset() {
      return await browser.declarativeNetRequest.getDynamicRules();
    },
  };

  return dnslinkResolver;
}
