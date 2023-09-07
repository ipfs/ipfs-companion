import { IRegexFilter, RegexFilter } from './baseRegexFilter.js'
import { DEFAULT_NAMESPACES, RULE_REGEX_ENDING, defaultNSRegexStr, escapeURLRegex } from './blockOrObserve.js'

/**
 * Handles subdomain redirects like:
 * origin: '^https?\\:\\/\\/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy\\.ipfs\\.dweb\\.link'
 * destination: 'http://localhost:8080/ipfs/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy'
 */
export class SubdomainRedirectRegexFilter extends RegexFilter {
  constructor ({ originUrl, redirectUrl }: IRegexFilter) {
    super({ originUrl, redirectUrl })
  }

  computeFilter (): void {
    this.regexSubstitution = this.redirectUrl
    this.regexFilter = this.originUrl
    if (!DEFAULT_NAMESPACES.has(this.originNS) && DEFAULT_NAMESPACES.has(this.redirectNS)) {
      // We'll use this to match the origin URL later.
      this.regexFilter = `^${escapeURLRegex(this.regexFilter)}`
      this.normalizeRegexFilter()
      const origRegexFilter = this.regexFilter
      // tld and root are known, we are just interested in the remainder of URL.
      const [tld, root, ...urlParts] = this.originURL.hostname.split('.').reverse()
      // can use the staticUrlParts to match the origin URL later.
      const staticUrlParts = [root, tld]
      // regex to match the start of the URL, this remains common.
      const commonStaticUrlStart = escapeURLRegex(`^${this.originURL.protocol}//`)
      // going though the subdomains to find a namespace or CID.
      while (urlParts.length > 0) {
        // get the urlPart at the 0th index and remove it from the array.
        const subdomainPart = urlParts.shift() as string
        // this needs to be computed for every iteration as the staticUrlParts changes
        const commonStaticUrlEnd = `\\.${escapeURLRegex(staticUrlParts.join('.'))}\\/${RULE_REGEX_ENDING}`
        // this does not work for subdomains where namespace is not provided.
        // e.g. https://helia-identify.on.fleek.co/
        // e.g. https://bafybeib3bzis4mejzsnzsb65od3rnv5ffit7vsllratddjkgfgq4wiamqu.on.fleek.co/
        // check if the subdomainPart is a namespace.
        if (DEFAULT_NAMESPACES.has(subdomainPart)) {
          // We found a namespace, this is going to match group 2, i.e. namespace.
          // e.g https://bafybeib3bzis4mejzsnzsb65od3rnv5ffit7vsllratddjkgfgq4wiamqu.ipfs.dweb.link
          this.regexFilter = `${commonStaticUrlStart}(.*?)\\.${defaultNSRegexStr}${commonStaticUrlEnd}`

          this.regexSubstitution = this._redirectUrl
            .replace(urlParts.reverse().join('.'), '\\1') // replace urlParts or CID.
            .replace(`/${subdomainPart}/`, '/\\2/') // replace namespace dynamically.

          const pathWithSearch = this.originURL.pathname + this.originURL.search
          if (pathWithSearch !== '/') {
            this.regexSubstitution = this.regexSubstitution.replace(pathWithSearch, '/\\3') // replace path
          } else {
            this.regexSubstitution += '\\3'
          }

          // no need to continue, we found a namespace.
          break
        }

        // till we find a namespace or CID, we keep adding subdomains to the staticUrlParts.
        staticUrlParts.unshift(subdomainPart)
      }

      if (this.regexFilter !== origRegexFilter) {
        // this means we constructed a regexFilter with dynamic parts, instead of the original regexFilter which was
        // static. There might be other suited regexFilters in that case.
        this.canHandle = true
      }
    }
  }
}
