'use strict'

import pMemoize from 'p-memoize'
import { LRUCache } from 'lru-cache'
import * as isIPFS from 'is-ipfs'
import isFQDN from 'is-fqdn'
import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { peerIdFromString } from '@libp2p/peer-id'

// Cap on how long a resolved CID / immutable path is memoized. These results
// come from mutable IPNS/DNSLink lookups whose target can change at any time,
// and ipfs.resolve() does not surface the record's own TTL, so we keep the
// cache short. p-memoize has no expiry of its own; the ttl lives on the
// LRUCache passed as its backing store (a plain Map would never expire).
const RESULT_TTL_MS = 60000 // 1 minute
const resultCache = () => new LRUCache({ max: 32, ttl: RESULT_TTL_MS })

export const dropSlash = url => url ? url.replace(/\/$/, '') : url

// Turns URL or URIencoded path into a content path
export function ipfsContentPath (urlOrPath, opts) {
  opts = opts || {}

  // ipfs:// → /ipfs/
  if (urlOrPath && urlOrPath.toString().startsWith('ip')) {
    urlOrPath = urlOrPath.replace(/^(ip[n|f]s):\/\//, '/$1/')
  }

  // Fail fast if no content path can be extracted from input
  if (!isIPFS.urlOrPath(urlOrPath)) return null

  // Turn path to URL (hostname does not matter, let's use localhost)
  if (isIPFS.path(urlOrPath)) urlOrPath = `https://localhost${urlOrPath}`

  // Create URL
  let url = typeof urlOrPath === 'string' ? new URL(urlOrPath) : urlOrPath

  if (isIPFS.subdomain(urlOrPath)) {
    // Move CID-in-subdomain to URL pathname
    let { id, ns } = subdomainPatternMatch(url)
    id = dnsLabelToFqdn(id)
    url = new URL(`https://localhost/${ns}/${id}${url.pathname}${url.search}${url.hash}`)
  }

  // To get IPFS content path we need to reverse URI encoding of special
  // characters (https://github.com/ipfs/ipfs-companion/issues/303)
  const contentPath = decodeURI(url.pathname)

  // End if not a content path
  if (!isIPFS.path(contentPath)) return null

  // Attach suffix with query parameters or hash if explicitly asked to do so
  if (opts.keepURIParams) return `${contentPath}${url.search}${url.hash}`

  // Else, return content path as-is
  return contentPath
}

// Turns URL or URIencoded path into a ipfs:// or ipns:// URI
export function ipfsUri (urlOrPath) {
  const contentPath = ipfsContentPath(urlOrPath, { keepURIParams: true })
  if (!contentPath) return null
  return contentPathToNativeUri(contentPath)
}

// Splits a content path into namespace, root and the remainder, e.g.
// /ipfs/<cid>/a/b?x#y -> { ns: 'ipfs', root: '<cid>', rest: '/a/b?x#y' }
function parseContentPath (contentPath) {
  const match = contentPath.match(/^\/(ipfs|ipns)\/([^/?#]+)(.*)$/)
  if (!match) return null
  const [, ns, root, rest] = match
  return { ns, root, rest }
}

// Turns a content path (/ipfs/<cid>/... or /ipns/<name>/...) into a native
// ipfs:// or ipns:// URI. Browsers treat the authority of these URIs as a
// case-insensitive origin, so the root is normalized to a case-insensitive CID.
export function contentPathToNativeUri (contentPath) {
  const parsed = parseContentPath(contentPath)
  if (!parsed) return null
  const { ns, root, rest } = parsed
  return `${ns}://${toCaseInsensitiveRoot(ns, root)}${rest}`
}

// Normalize the root of a native URI so it survives as a case-insensitive origin.
// Only ipfs and ipns are valid namespaces; anything else is a programmer error.
// Roots we cannot parse are returned unchanged.
export function toCaseInsensitiveRoot (ns, root) {
  if (ns === 'ipfs') {
    // any CID collapses to a base32 CIDv1 (its multicodec is preserved)
    try {
      return CID.parse(root).toV1().toString(base32)
    } catch (e) {
      return root
    }
  }
  if (ns === 'ipns') {
    // DNSLink hostnames contain a dot and are left as-is; peer ids (PeerId or
    // CID) normalize to a base36 CIDv1 with the libp2p-key codec
    if (root.includes('.')) return root
    try {
      return peerIdFromString(root).toCID().toString(base36)
    } catch (e) {
      return root
    }
  }
  throw new Error(`toCaseInsensitiveRoot: unsupported namespace '${ns}'`)
}

// A subdomain gateway puts the root (CID or IPNS name) in a DNS label, which
// public DNS caps at 63 characters.
const DNS_LABEL_MAX = 63

// Build a subdomain-gateway URL from a content path, e.g.
// /ipfs/<cid>/x + https://dweb.link -> https://<cid-base32>.ipfs.dweb.link/x
// (the label is normalized to a case-insensitive CID). A DNSLink hostname cannot
// be a subdomain label, so we share the FQDN website itself. Returns null when
// the path cannot be represented as a subdomain URL: a root that is not a valid
// hostname (e.g. an /ipns/ name with spaces), or a label longer than a DNS
// label allows (e.g. a CID with a sha2-512 multihash); callers fall back to a
// path gateway or a native URI.
export function contentPathToSubdomainUrl (contentPath, gwURL) {
  const parsed = parseContentPath(contentPath)
  if (!parsed) return null
  const { ns, root, rest } = parsed
  try {
    if (ns === 'ipns' && root.includes('.')) {
      return trimDoubleSlashes(new URL(`${gwURL.protocol}//${root}${rest}`).toString())
    }
    const label = toCaseInsensitiveRoot(ns, root)
    if (label.length > DNS_LABEL_MAX) return null
    return trimDoubleSlashes(new URL(`${gwURL.protocol}//${label}.${ns}.${gwURL.host}${rest}`).toString())
  } catch (e) {
    return null
  }
}

// Attach a content path to a public gateway for a shareable link, preferring
// the subdomain gateway (origin isolation) and falling back to the path
// gateway when the subdomain gateway is not set or cannot represent the path.
// Returns null when no configured gateway can serve it.
function publicShareUrl (contentPath, state) {
  if (!contentPath) return null
  const { pubGwURLString, pubSubdomainGwURL } = state
  if (pubSubdomainGwURL) {
    const subdomainUrl = contentPathToSubdomainUrl(contentPath, pubSubdomainGwURL)
    if (subdomainUrl) return subdomainUrl
  }
  if (pubGwURLString) return pathAtHttpGateway(contentPath, pubGwURLString)
  return null
}

// Shareable form of an already-normalized content path: a public gateway URL
// when usePublicGatewaysForShare is on and a public gateway can serve the
// path, the native ipfs:// / ipns:// URI otherwise. Takes the path verbatim;
// it must not be re-parsed here, as another decodeURI pass would corrupt
// percent-encoded segments.
function shareUrlForContentPath (contentPath, state) {
  if (state.usePublicGatewaysForShare) {
    const publicUrl = publicShareUrl(contentPath, state)
    if (publicUrl) return publicUrl
  }
  return contentPathToNativeUri(contentPath)
}

function subdomainPatternMatch (url) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  const match = url.toString().match(isIPFS.subdomainGatewayPattern)
  if (!match || match.length < 3) return false
  const id = match[1]
  const ns = match[2]
  return { id, ns }
}

function dnsLabelToFqdn (label) {
  if (label && !label.includes('.') && label.includes('-') && !isIPFS.cid(label)) {
    // no '.' means the subdomain name is most likely an inlined DNSLink into single DNS label
    // en-wikipedia--on--ipfs-org → en.wikipedia-on-ipfs.org
    // (https://github.com/ipfs/in-web-browsers/issues/169)
    label = label.replace(/--/g, '@').replace(/-/g, '.').replace(/@/g, '-')
  }
  return label
}

export function pathAtHttpGateway (path, gatewayUrl) {
  // return URL without duplicated slashes
  return trimDoubleSlashes(new URL(`${gatewayUrl}${path}`).toString())
}

function swapSubdomainGateway (url, subdomainGwURL) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  const { id, ns } = subdomainPatternMatch(url)
  if (!id || !ns) throw new Error('no matching isIPFS.*subdomainPattern')
  return new URL(trimDoubleSlashes(
    `${subdomainGwURL.protocol}//${id}.${ns}.${subdomainGwURL.hostname}${url.pathname}${url.search}${url.hash}`
  )).toString()
}

export function trimDoubleSlashes (urlString) {
  return urlString.replace(/([^:]\/)\/+/g, '$1')
}

export function trimHashAndSearch (urlString) {
  // https://github.com/ipfs-shipyard/ipfs-companion/issues/567
  return urlString.split('#')[0].split('?')[0]
}

// Returns true if URL belongs to the gateway.
// The check includes subdomain gateways and quirks of ipfs.io
export function sameGateway (url, gwUrl) {
  // no gateway configured: nothing can belong to it
  if (!gwUrl) return false
  if (typeof url === 'string') {
    url = new URL(url)
  }
  if (typeof gwUrl === 'string') {
    gwUrl = new URL(gwUrl)
  }

  if (url.hostname === 'ipfs.io') {
    // canonical gateway uses the same hostname as various DNSLink websites
    // related to IPFS project. To avoid false-positive we reduce it to only
    // match as path-based gateway, and not subdomains.
    return url.hostname === gwUrl.hostname
  }
  if (url.hostname === '0.0.0.0') {
    // normalize 0.0.0.0 (used by go-ipfs in the console)
    // to 127.0.0.1 to minimize the number of edge cases we need to handle later
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/867
    url = new URL(url.toString())
    url.hostname = '127.0.0.1'
  }

  // Additional check to avoid false-positives when user has some unrelated HTTP server running on localhost:8080
  // It is not "sameGateway" if "localhost" URL does not look like Gateway or RPC URL.
  // This removes surface for bugs like https://github.com/ipfs/ipfs-companion/issues/1162
  if (!(isIPFS.url(url.toString()) || isIPFS.subdomain(url.toString()) || url.pathname.startsWith('/api/v0/') || url.pathname.startsWith('/webui'))) return false

  const gws = [gwUrl.host]

  // localhost gateway has more than one hostname
  if (gwUrl.hostname === 'localhost') {
    gws.push(`127.0.0.1:${gwUrl.port}`)
  }
  if (gwUrl.hostname === '127.0.0.1' || gwUrl.hostname === '[::1]') {
    gws.push(`localhost:${gwUrl.port}`)
  }

  for (const gwName of gws) {
    // match the exact host or its subdomains (subdomain gateways); the label
    // boundary keeps unrelated hosts sharing a suffix (nondefaultipfs.io vs
    // ipfs.io) from matching
    if (url.host === gwName || url.host.endsWith(`.${gwName}`)) return true
  }
  return false
}

export const safeHostname = (url) => {
  // In case vendor-specific thing like brave://settings/extensions
  // cause errors, we don't throw, just return null
  try {
    return new URL(url).hostname
  } catch (e) {
    console.error(`[ipfs-companion] safeHostname(url) error for url='${url}'`, e)
  }
  return null
}

export function createIpfsPathValidator (getState, getIpfs, dnslinkResolver) {
  const ipfsPathValidator = {
    // Test if URL is a Public IPFS resource
    // (pass validIpfsOrIpns(url) and not at the local gateway or API)
    async publicIpfsOrIpnsResource (url) {
      // exclude custom gateway and api, otherwise we have infinite loops
      const { gwURL, apiURL } = getState()
      if (!sameGateway(url, gwURL) && !sameGateway(url, apiURL)) {
        return this.validIpfsOrIpns(url)
      }
      return false
    },

    // Test if URL or a path is a valid IPFS resource
    // (IPFS needs to be a CID, IPNS can be PeerId or have dnslink entry)
    async validIpfsOrIpns (urlOrPath) {
      // normalize input to a content path
      const path = ipfsContentPath(urlOrPath)
      if (!path) return false

      // `/ipfs/` is easy to validate, we just check if CID is correct
      if (isIPFS.ipfsPath(path)) {
        return true
      }

      // `/ipns/` requires multiple stages/branches (can be FQDN with dnslink or CID)
      if (isIPFS.ipnsPath(path)) {
        // we may have false-positives here, so we do additional checks below
        const ipnsRoot = path.match(/^\/ipns\/([^/?#]+)/)[1]
        // console.log('==> IPNS root', ipnsRoot)
        // first check if root is a regular CID
        // TODO: support all peerIds, not just cids?
        if (isIPFS.cid(ipnsRoot)) {
          // console.log('==> IPNS is a valid CID', ipnsRoot)
          return true
        }
        // then see if there is an DNSLink entry for 'ipnsRoot' hostname
        // TODO: use dnslink cache only
        if (await dnslinkResolver.readAndCacheDnslink(ipnsRoot)) {
          // console.log('==> IPNS for FQDN with valid dnslink: ', ipnsRoot)
          return true
        }
      }
      // everything else is not IPFS-related
      return false
    },

    // Test if actions such as 'copy URL', 'pin/unpin' should be enabled for the URL
    isIpfsPageActionsContext (url) {
      if (!url) return false
      const { apiURLString } = getState()
      const { hostname } = new URL(url)
      return Boolean(url && !url.startsWith(apiURLString) && (
        !!ipfsContentPath(url) ||
        dnslinkResolver.cachedDnslink(hostname)
      ))
    },

    // Test if actions such as 'per site redirect toggle' should be enabled for the URL
    isRedirectPageActionsContext (url) {
      const { localGwAvailable, gwURL, apiURL } = getState()
      return localGwAvailable && // show only when redirect is possible
      (isIPFS.ipnsUrl(url) || // show on /ipns/<fqdn>
        ((url.startsWith('http') || url.startsWith('ip')) && // hide on non-HTTP/native pages
         !sameGateway(url, gwURL) && // hide on /ipfs/* and *.ipfs.
          !sameGateway(url, apiURL))) // hide on api port
    },

    // Resolve URL or path to a public HTTP URL:
    // - content paths are attached to the public path gateway, or to the
    //   public subdomain gateway when only that one is configured
    // - subdomain gateway URLs are attached to the public subdomain gateway
    //   only: a subdomain request asks for origin isolation and is never
    //   downgraded to a path gateway
    // - URLs of DNSLinked websites are returned as-is
    // - the native ipfs:// / ipns:// URI is returned when no acceptable
    //   public gateway is configured
    async resolveToPublicUrl (urlOrPath) {
      const { pubSubdomainGwURL, pubGwURLString } = getState()
      const input = urlOrPath

      // NATIVE ipns:// with DNSLink requires simple protocol swap
      if (input.startsWith('ipns://')) {
        // no public gateway configured: keep the native ipns:// URI
        if (!pubGwURLString && !pubSubdomainGwURL) return input
        // the non-special ipns: scheme cannot be swapped in-place via
        // URL.protocol assignment, so rewrite it before parsing
        const dnslinkUrl = new URL(input.replace(/^ipns:\/\//, 'https://'))
        const dnslink = await dnslinkResolver.readAndCacheDnslink(dnslinkUrl.hostname)
        if (dnslink) {
          return dnslinkUrl.toString()
        }
      }

      // SUBDOMAINS
      // Detect *.dweb.link and other subdomain gateways
      if (isIPFS.subdomain(input)) {
        // A subdomain request asks for origin isolation and is never
        // downgraded to a path gateway. With no public subdomain gateway
        // configured, copy the native ipfs:// / ipns:// URI instead.
        if (!pubSubdomainGwURL) return ipfsUri(input)
        // Switch Origin to prefered public subdomain gateway (default: dweb.link)
        const subdomainUrl = swapSubdomainGateway(input, pubSubdomainGwURL)

        // *.ipfs namespace is easy, just return
        if (isIPFS.ipfsSubdomain(subdomainUrl)) return subdomainUrl

        // DNSLink in subdomains does not make sense outside of *.localhost
        // and is usually not supported due to limitation of TLS wildcart certs.
        // Instead, we resolve it to the canonical FQDN Origin
        //
        // Remove gateway suffix to get potential FQDN
        const url = new URL(subdomainUrl)
        const { id: ipnsId } = subdomainPatternMatch(url)
        if (!isIPFS.cid(ipnsId)) {
          // Confirm DNSLink record is present and its not a false-positive
          const dnslink = await dnslinkResolver.readAndCacheDnslink(ipnsId)
          if (dnslink) {
            // return URL to DNSLink hostname (FQDN without any suffix)
            url.hostname = ipnsId
            return url.toString()
          }
        }

        // Return *.ipns with libp2p-key
        if (isIPFS.ipnsSubdomain(subdomainUrl)) return subdomainUrl
      }

      // PATHS
      const ipfsPath = ipfsContentPath(input, { keepURIParams: true })

      // IPFS Paths should be attached to the public gateway
      if (isIPFS.path(ipfsPath)) {
        if (pubGwURLString) return pathAtHttpGateway(ipfsPath, pubGwURLString)
        // a subdomain gateway can serve a content path too
        if (pubSubdomainGwURL) {
          const subdomainUrl = contentPathToSubdomainUrl(ipfsPath, pubSubdomainGwURL)
          if (subdomainUrl) return subdomainUrl
        }
        // no public gateway configured: copy the native ipfs:// / ipns:// URI
        return ipfsUri(input)
      }

      // Return original URL as-is (eg. DNSLink domains) or null if not an URL
      return input && input.startsWith('http') ? input : null
    },

    // Resolve URL or path to a native ipfs:// or ipns:// URI:
    // - Gateway URLs and CID-in-subdomain are turned into ipfs://… / ipns://…
    // - DNSLinked websites resolve to ipns://<fqdn> when a DNSLink is cached
    // - Non-IPFS HTTP URLs are returned as-is, anything else yields null
    resolveToNativeUri (urlOrPath) {
      const ipfsPath = ipfsPathValidator.resolveToIpfsPath(urlOrPath)
      if (ipfsPath) return contentPathToNativeUri(ipfsPath)
      return urlOrPath && urlOrPath.startsWith('http') ? urlOrPath : null
    },

    // Resolve URL or path to the link used by "Copy Shareable Link":
    // a public gateway URL when usePublicGatewaysForShare is on (subdomain
    // gateway preferred, path gateway as fallback), or the native
    // ipfs:// / ipns:// URI when it is off or no public gateway is set.
    async resolveToShareableUrl (urlOrPath) {
      const contentPath = ipfsPathValidator.resolveToIpfsPath(urlOrPath)
      if (contentPath) return shareUrlForContentPath(contentPath, getState())
      // Non-IPFS HTTP URLs are returned as-is, anything else yields null
      return urlOrPath && urlOrPath.startsWith('http') ? urlOrPath : null
    },

    // Always returns the path form at the local gateway (e.g.
    // http://localhost:8080/ipfs/<cid>), never a subdomain URL, even though the
    // local gateway runs as a subdomain gateway by default. The gateway itself
    // redirects the path to the isolated subdomain origin, and deferring that to
    // the gateway instead of building the subdomain URL here is deliberate:
    //   - it honors the gateway's own subdomain configuration rather than
    //     forcing subdomain mode from the client
    //   - the gateway can normalize CIDs that this extension's client-side
    //     subdomain builder cannot, e.g. a CID whose base32 label exceeds the
    //     63-char DNS label limit (contentPathToSubdomainUrl returns null for
    //     those, such as a sha2-512 multihash)
    //   - it stays correct as gateways add future subdomain normalizations for
    //     long CIDs without needing a matching change here
    resolveToLocalUrl (urlOrPath) {
      const { gwURLString } = getState()
      const ipfsPath = ipfsContentPath(urlOrPath, { keepURIParams: true })
      if (isIPFS.path(ipfsPath)) return pathAtHttpGateway(ipfsPath, gwURLString)
      return null
    },

    // Resolve URL or path to HTTP URL with CID:
    // - IPFS paths are attached to HTTP Gateway root
    // - URL of DNSLinked websties are resolved to CIDs
    // The purpose of this resolver is to always return a meaningful, publicly
    // accessible URL that can be accessed without the need of an IPFS client
    // and that never changes.
    async resolveToPermalink (urlOrPath, optionalGatewayUrl) {
      const input = urlOrPath
      const ipfsPath = await this.resolveToImmutableIpfsPath(input)
      if (!ipfsPath) return input.startsWith('http') ? input : null
      // an explicit gateway wins; otherwise the immutable path follows the same
      // share preference as "Copy Shareable Link" (the path is already decoded,
      // so it goes to the shared helper without another resolve pass)
      if (optionalGatewayUrl) return pathAtHttpGateway(ipfsPath, optionalGatewayUrl)
      return shareUrlForContentPath(ipfsPath, getState())
    },

    // Resolve URL or path to IPFS Path:
    // - The path can be /ipfs/ or /ipns/
    // - Keeps pathname + ?search + #hash from original URL
    // - Returns null if no valid path can be produced
    // The purpose of this resolver is to return a valid IPFS path
    // that can be accessed with IPFS client.
    resolveToIpfsPath (urlOrPath) {
      const input = urlOrPath
      // Try to normalize to IPFS path (gateway path or CID-in-subdomain)
      const ipfsPath = ipfsContentPath(input, { keepURIParams: true })
      if (ipfsPath) return ipfsPath
      // Check URL for DNSLink
      if (!input.startsWith('http')) return null
      const { hostname } = new URL(input)
      const dnslink = dnslinkResolver.cachedDnslink(hostname)
      if (dnslink) {
        // Return full IPNS path (keeps pathname + ?search + #hash)
        return dnslinkResolver.convertToIpnsPath(input)
      }
      // No IPFS path by this point
      return null
    },

    // Resolve URL or path to Immutable IPFS Path:
    // - Same as resolveToIpfsPath, but the path is always immutable /ipfs/
    // - Keeps pathname + ?search + #hash from original URL
    // - Returns null if no valid path can be produced
    // The purpose of this resolver is to return immutable /ipfs/ address
    // even if /ipns/ is present in its input.
    resolveToImmutableIpfsPath: pMemoize(async function (urlOrPath) {
      const path = ipfsPathValidator.resolveToIpfsPath(urlOrPath)
      // Fail fast if no IPFS Path
      if (!path) return null
      // Resolve /ipns/ → /ipfs/
      if (isIPFS.ipnsPath(path)) {
        // We resolve /ipns/<fqdn> as value in DNSLink cache may be out of date
        const ipnsRoot = `/ipns/${path.split('/')[2]}`
        const result = await getIpfs().resolve(ipnsRoot, { recursive: true })

        // Old API returned object, latest one returns string ¯\_(ツ)_/¯
        const ipfsRoot = result.Path ? result.Path : result
        // Return original path with swapped root (keeps pathname + ?search + #hash)
        return path.replace(ipnsRoot, ipfsRoot)
      }
      // Return /ipfs/ path
      return path
    }, { cache: resultCache() }),

    // Resolve URL or path to a raw CID:
    // - Result is the direct CID
    // - Ignores ?search and #hash from original URL
    // - Returns null if no CID can be produced
    // The purpose of this resolver is to return direct CID without anything else.
    resolveToCid: pMemoize(async function (urlOrPath) {
      const path = ipfsPathValidator.resolveToIpfsPath(urlOrPath)
      // Fail fast if no IPFS Path
      if (!path) return null
      // Drop unused parts
      const rawPath = trimHashAndSearch(path)

      // js-ipfs v0.34 does not support DNSLinks in ipfs.resolve: https://github.com/ipfs/js-ipfs/issues/1918
      // TODO: remove ipfsResolveWithDnslinkFallback when js-ipfs implements DNSLink support in ipfs.resolve
      const ipfsResolveWithDnslinkFallback = async (resolve) => {
        try {
          return await resolve()
        } catch (err) {
          const fqdn = rawPath.replace(/^.*\/ipns\/([^/]+).*/, '$1')
          if (err.message === 'resolve non-IPFS names is not implemented' && isFQDN(fqdn)) {
            // js-ipfs without dnslink support, fallback to the value read from DNSLink
            const dnslink = await dnslinkResolver.readAndCacheDnslink(fqdn)
            if (dnslink) {
              // swap problematic /ipns/{fqdn} with /ipfs/{cid} and retry lookup
              const safePath = trimDoubleSlashes(rawPath.replace(/^.*(\/ipns\/[^/]+)/, dnslink))
              if (rawPath !== safePath) {
                const result = await ipfsPathValidator.resolveToCid(safePath)
                // return in format of ipfs.resolve()
                return isIPFS.cid(result) ? `/ipfs/${result}` : result
              }
            }
          }
          throw err
        }
      }
      const result = await ipfsResolveWithDnslinkFallback(async () =>
        // dhtt/dhtrc optimize for lookup time
        getIpfs().resolve(rawPath, { recursive: true, dhtt: '5s', dhtrc: 1 })
      )

      const directCid = isIPFS.ipfsPath(result) ? result.split('/')[2] : result
      return directCid
    }, { cache: resultCache() })
  }

  return ipfsPathValidator
}
