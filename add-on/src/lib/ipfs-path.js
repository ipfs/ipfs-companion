'use strict'
/* eslint-env browser */

const isIPFS = require('is-ipfs')
const isFQDN = require('is-fqdn')

function normalizedIpfsPath (urlOrPath) {
  let result = urlOrPath
  // Convert CID-in-subdomain URL to /ipns/<fqdn>/ path
  if (isIPFS.subdomain(urlOrPath)) {
    result = subdomainToIpfsPath(urlOrPath)
  }
  // Drop everything before the IPFS path
  result = result.replace(/^.*(\/ip(f|n)s\/.+)$/, '$1')
  // Remove Unescape special characters
  // https://github.com/ipfs/ipfs-companion/issues/303
  result = decodeURIComponent(result)
  // Return a valid IPFS path or null otherwise
  return isIPFS.path(result) ? result : null
}
exports.normalizedIpfsPath = normalizedIpfsPath

function subdomainToIpfsPath (url) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  const { id, ns } = subdomainPatternMatch(url)
  return `/${ns}/${id}${url.pathname}${url.search}${url.hash}`
}

// TODO: add tests
function subdomainPatternMatch (url) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  const match = url.toString().match(isIPFS.subdomainPattern)
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

// returns true if URL belongs to the gateway
function sameGateway (url, gwUrl) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  if (typeof gwUrl === 'string') {
    gwUrl = new URL(gwUrl)
  }
  const gws = [gwUrl.hostname]

  // localhost gateway has more than one hostname
  if (gwUrl.hostname === 'localhost') {
    gws.push(`127.0.0.1:${gwUrl.port}`)
  }
  if (gwUrl.hostname === '127.0.0.1' || url.hostname === '[::1]') {
    gws.push(`localhost:${gwUrl.port}`)
  }

  for (const gwName of gws) {
    // match against the end to include subdomain gateways
    if (url.hostname.endsWith(gwName)) return true
  }
  return false
}
exports.sameGateway = sameGateway

function createIpfsPathValidator (getState, getIpfs, dnslinkResolver) {
  const ipfsPathValidator = {
    // Test if URL is a Public IPFS resource
    // (pass validIpfsOrIpnsUrl(url) and not at the local gateway or API)
    publicIpfsOrIpnsResource (url) {
      // exclude custom gateway and api, otherwise we have infinite loops
      const { gwURL, apiURL } = getState()
      if (!sameGateway(url, gwURL) && !sameGateway(url, apiURL)) {
        return validIpfsOrIpnsUrl(url, dnslinkResolver)
      }
      return false
    },

    // Test if URL is a valid IPFS or IPNS
    // (IPFS needs to be a CID, IPNS can be PeerId or have dnslink entry)
    validIpfsOrIpnsUrl (url) {
      return validIpfsOrIpnsUrl(url, dnslinkResolver)
    },

    // Same as validIpfsOrIpnsUrl (url) but for paths
    // (we have separate methods to avoid 'new URL' where possible)
    validIpfsOrIpnsPath (path) {
      return validIpfsOrIpnsPath(path, dnslinkResolver)
    },
    // Test if URL is a subdomain gateway resource
    ipfsOrIpnsSubdomain (url) {
      return isIPFS.subdomain(url)
    },
    // Test if actions such as 'copy URL', 'pin/unpin' should be enabled for the URL
    isIpfsPageActionsContext (url) {
      const { apiURLString } = getState()
      const { hostname } = new URL(url)
      return Boolean(url && !url.startsWith(apiURLString) && (
        isIPFS.url(url) ||
        isIPFS.subdomain(url) ||
        dnslinkResolver.cachedDnslink(hostname)
      ))
    },

    // Test if actions such as 'per site redirect toggle' should be enabled for the URL
    isRedirectPageActionsContext (url) {
      const { ipfsNodeType, gwURL, apiURL } = getState()
      return ipfsNodeType !== 'embedded' && // hide with embedded node
      (isIPFS.ipnsUrl(url) || // show on /ipns/<fqdn>
        (url.startsWith('http') && // hide on non-HTTP pages
         !sameGateway(url, gwURL) && // hide on /ipfs/* and *.ipfs.
          !sameGateway(url, apiURL))) // hide on api port
    },

    // Resolve URL or path to HTTP URL:
    // - IPFS paths are attached to HTTP Path Gateway root
    // - IPFS subdomains are attached to HTTP Subdomain Gateway root
    // - URL of DNSLinked websites are returned as-is
    // The purpose of this resolver is to always return a meaningful, publicly
    // accessible URL that can be accessed without the need of IPFS client.
    resolveToPublicUrl (urlOrPath, optionalGatewayUrl) {
      const input = urlOrPath
      const { pubSubdomainGwURL, pubGwURLString } = getState()
      // SUBDOMAINS
      // Detect *.localhost and other subdomain gateways
      if (isIPFS.subdomain(input)) {
        // Switch Origin to prefered public subdomain gateway (default: dweb.link)
        const subdomainUrl = swapSubdomainGateway(input, pubSubdomainGwURL)
        // DNSLink in subdomains does not make sense outside of *.localhost
        // and is usually not supported due to limitation of TLS wildcart certs.
        // Instead, we resolve it to the canonical FQDN Origin
        if (isIPFS.dnslinkSubdomain(subdomainUrl)) {
          const url = new URL(subdomainUrl)
          // remove gateway suffix to get original FQDN
          url.hostname = url.hostname.replace(`.ipns.${pubSubdomainGwURL.hostname}`, '')
          // Confirm DNSLink record is present and its not a false-positive
          const dnslink = dnslinkResolver.readAndCacheDnslink(url.hostname)
          if (dnslink) return url.toString()
        }
        return subdomainUrl
      }
      // PATHS
      // IPFS Paths should be attached to the public gateway
      const ipfsPath = normalizedIpfsPath(input)
      const gateway = optionalGatewayUrl || pubGwURLString
      // TODO: make below return links to dweb.link
      if (ipfsPath) return pathAtHttpGateway(ipfsPath, gateway)
      // Return original URL (eg. DNSLink domains) or null if not an URL
      return input.startsWith('http') ? input : null
    },
    // Resolve URL or path to subdomain gateway
    // - non-subdomain path is returned as-is
    // The purpose of this resolver is to return a valid IPFS
    // subdomain URL
    resolveToPublicSubdomainUrl (url, optionalGatewayUrl) {
      // if non-subdomain return as-is
      if (!isIPFS.subdomain(url)) return url

      const gateway = optionalGatewayUrl || getState().pubSubdomainGwURL
      return swapSubdomainGateway(url, gateway)
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
      const ipfsPath = normalizedIpfsPath(input)
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
    async resolveToImmutableIpfsPath (urlOrPath) {
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
    },

    // Resolve URL or path to a raw CID:
    // - Result is the direct CID
    // - Ignores ?search and #hash from original URL
    // - Returns null if no CID can be produced
    // The purpose of this resolver is to return direct CID without anything else.
    async resolveToCid (urlOrPath) {
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
    }
  }

  return ipfsPathValidator
}
exports.createIpfsPathValidator = createIpfsPathValidator

function validIpfsOrIpnsUrl (url, dnsLink) {
  // `/ipfs/` is easy to validate, we just check if CID is correct
  if (isIPFS.ipfsUrl(url)) {
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
  if (isIPFS.ipfsPath(path)) {
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
  if (isIPFS.ipnsPath(path)) {
    // we may have false-positives here, so we do additional checks below
    const ipnsRoot = path.match(/^\/ipns\/([^/?#]+)/)[1]
    // console.log('==> IPNS root', ipnsRoot)
    // first check if root is a regular CID
    if (isIPFS.cid(ipnsRoot)) {
      // console.log('==> IPNS is a valid CID', ipnsRoot)
      return true
    }
    // then see if there is an DNSLink entry for 'ipnsRoot' hostname
    // TODO: use dnslink cache only
    if (dnsLink.readAndCacheDnslink(ipnsRoot)) {
      // console.log('==> IPNS for FQDN with valid dnslink: ', ipnsRoot)
      return true
    }
  }
  return false
}
