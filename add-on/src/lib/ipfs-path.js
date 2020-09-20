'use strict'
/* eslint-env browser */

const pMemoize = require('p-memoize')
const isIPFS = require('is-ipfs')
const isFQDN = require('is-fqdn')

// For how long more expensive lookups (DAG traversal etc) should be cached
const RESULT_TTL_MS = 30 * 1000

// Turns URL or URIencoded path into a content path
function ipfsContentPath (urlOrPath, opts) {
  opts = opts || {}

  // Fail fast if no content path can be extracted from input
  if (!isIPFS.urlOrPath(urlOrPath)) return null

  // Turn path to URL (hostname does not matter, let's use localhost)
  if (isIPFS.path(urlOrPath)) urlOrPath = `https://localhost${urlOrPath}`

  // Create URL
  let url = typeof urlOrPath === 'string' ? new URL(urlOrPath) : urlOrPath

  if (isIPFS.subdomain(urlOrPath)) {
    // Move CID-in-subdomain to URL pathname
    const { id, ns } = subdomainPatternMatch(url)
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
exports.ipfsContentPath = ipfsContentPath

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

function pathAtHttpGateway (path, gatewayUrl) {
  // return URL without duplicated slashes
  return trimDoubleSlashes(new URL(`${gatewayUrl}${path}`).toString())
}
exports.pathAtHttpGateway = pathAtHttpGateway

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

function trimDoubleSlashes (urlString) {
  return urlString.replace(/([^:]\/)\/+/g, '$1')
}
exports.trimDoubleSlashes = trimDoubleSlashes

function trimHashAndSearch (urlString) {
  // https://github.com/ipfs-shipyard/ipfs-companion/issues/567
  return urlString.split('#')[0].split('?')[0]
}
exports.trimHashAndSearch = trimHashAndSearch

// Returns true if URL belongs to the gateway.
// The check includes subdomain gateways and quirks of ipfs.io
function sameGateway (url, gwUrl) {
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

  const gws = [gwUrl.host]

  // localhost gateway has more than one hostname
  if (gwUrl.hostname === 'localhost') {
    gws.push(`127.0.0.1:${gwUrl.port}`)
  }
  if (gwUrl.hostname === '127.0.0.1' || gwUrl.hostname === '[::1]') {
    gws.push(`localhost:${gwUrl.port}`)
  }

  for (const gwName of gws) {
    // match against the end to include subdomain gateways
    if (url.host.endsWith(gwName)) return true
  }
  return false
}
exports.sameGateway = sameGateway

function createIpfsPathValidator (getState, getIpfs, dnslinkResolver) {
  const ipfsPathValidator = {
    // Test if URL is a Public IPFS resource
    // (pass validIpfsOrIpns(url) and not at the local gateway or API)
    publicIpfsOrIpnsResource (url) {
      // exclude custom gateway and api, otherwise we have infinite loops
      const { gwURL, apiURL } = getState()
      if (!sameGateway(url, gwURL) && !sameGateway(url, apiURL)) {
        return this.validIpfsOrIpns(url)
      }
      return false
    },

    // Test if URL or a path is a valid IPFS resource
    // (IPFS needs to be a CID, IPNS can be PeerId or have dnslink entry)
    validIpfsOrIpns (urlOrPath) {
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
        if (dnslinkResolver.readAndCacheDnslink(ipnsRoot)) {
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
        isIPFS.url(url) ||
        dnslinkResolver.cachedDnslink(hostname)
      ))
    },

    // Test if actions such as 'per site redirect toggle' should be enabled for the URL
    isRedirectPageActionsContext (url) {
      const { localGwAvailable, gwURL, apiURL } = getState()
      return localGwAvailable && // show only when redirect is possible
      (isIPFS.ipnsUrl(url) || // show on /ipns/<fqdn>
        (url.startsWith('http') && // hide on non-HTTP pages
         !sameGateway(url, gwURL) && // hide on /ipfs/* and *.ipfs.
          !sameGateway(url, apiURL))) // hide on api port
    },

    // Resolve URL or path to HTTP URL:
    // - IPFS paths are attached to HTTP Path Gateway root
    // - IPFS subdomains are attached to HTTP Subdomain Gateway root
    // - URL of DNSLinked websites are returned as-is
    //
    // The purpose of this resolver is to always return a meaningful, publicly
    // accessible URL that can be accessed without the need of IPFS client.
    // TODO: add Local version
    resolveToPublicUrl (urlOrPath) {
      const { pubSubdomainGwURL, pubGwURLString } = getState()
      const input = urlOrPath

      // SUBDOMAINS
      // Detect *.dweb.link and other subdomain gateways
      if (isIPFS.subdomain(input)) {
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
        // TODO: replace below with regex that match any subdomain gw
        const { id: ipnsId } = subdomainPatternMatch(url)
        // Ensure it includes .tld (needs at least one dot)
        if (ipnsId.includes('.')) {
          // Confirm DNSLink record is present and its not a false-positive
          const dnslink = dnslinkResolver.readAndCacheDnslink(ipnsId)
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
      if (isIPFS.path(ipfsPath)) return pathAtHttpGateway(ipfsPath, pubGwURLString)

      // Return original URL as-is (eg. DNSLink domains) or null if not an URL
      return input && input.startsWith('http') ? input : null
    },

    // Version of resolveToPublicUrl that always resolves to URL representing
    // path gateway at local machine (This is ok, as subdomain will redirect
    // to corre
    resolveToLocalUrl (urlOrPath) {
      const { gwURLString } = getState()
      const ipfsPath = ipfsContentPath(urlOrPath, { keepURIParams: true })
      if (isIPFS.path(ipfsPath)) return pathAtHttpGateway(ipfsPath, gwURLString)
      return null
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
        const labels = path.split('/')
        // We resolve /ipns/<fqdn> as value in DNSLink cache may be out of date
        const ipnsRoot = `/ipns/${labels[2]}`

        // js-ipfs v0.34 does not support DNSLinks in ipfs.name.resolve: https://github.com/ipfs/js-ipfs/issues/1918
        // TODO: remove ipfsNameResolveWithDnslinkFallback when js-ipfs implements DNSLink support in ipfs.name.resolve
        const ipfsNameResolveWithDnslinkFallback = async (resolve) => {
          try {
            return await resolve()
          } catch (err) {
            const fqdn = ipnsRoot.replace(/^.*\/ipns\/([^/]+).*/, '$1')
            if (err.message === 'Non-base58 character' && isFQDN(fqdn)) {
              // js-ipfs without dnslink support, fallback to the value read from DNSLink
              const dnslink = dnslinkResolver.readAndCacheDnslink(fqdn)
              if (dnslink) {
                // swap problematic /ipns/{fqdn} with /ipfs/{cid} and retry lookup
                const safePath = trimDoubleSlashes(ipnsRoot.replace(/^.*(\/ipns\/[^/]+)/, dnslink))
                if (ipnsRoot !== safePath) {
                  return ipfsPathValidator.resolveToImmutableIpfsPath(safePath)
                }
              }
            }
            throw err
          }
        }
        const result = await ipfsNameResolveWithDnslinkFallback(async () =>
          // dhtt/dhtrc optimize for lookup time
          getIpfs().name.resolve(ipnsRoot, { recursive: true, dhtt: '5s', dhtrc: 1 })
        )

        // Old API returned object, latest one returns string ¯\_(ツ)_/¯
        const ipfsRoot = result.Path ? result.Path : result
        // Return original path with swapped root (keeps pathname + ?search + #hash)
        return path.replace(ipnsRoot, ipfsRoot)
      }
      // Return /ipfs/ path
      return path
    }, { maxAge: RESULT_TTL_MS }),

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
            const dnslink = dnslinkResolver.readAndCacheDnslink(fqdn)
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
    }, { maxAge: RESULT_TTL_MS })
  }

  return ipfsPathValidator
}
exports.createIpfsPathValidator = createIpfsPathValidator
