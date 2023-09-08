import { RegexFilter } from './baseRegexFilter.js'
import { DEFAULT_NAMESPACES, RULE_REGEX_ENDING, defaultNSRegexStr, escapeURLRegex } from './blockOrObserve.js'

/**
 * Handles namespace redirects like:
 * origin: '^https?\\:\\/\\/ipfs\\.io\\/(ipfs|ipns)\\/(.*)'
 * destination: 'http://localhost:8080/$1/$2'
 */
export class NamespaceRedirectRegexFilter extends RegexFilter {
  computeFilter (isBraveOverride: boolean): void {
    this.canHandle = DEFAULT_NAMESPACES.has(this.originNS) &&
      DEFAULT_NAMESPACES.has(this.redirectNS) &&
      this.originNS === this.redirectNS &&
      this.originURL.searchParams.get('uri') == null
    // if the namespaces are the same, we can generate simpler regex.
    // The only value that needs special handling is the `uri` param.
    // A redirect like
    // https://ipfs.io/ipfs/QmZMxU -> http://localhost:8080/ipfs/QmZMxU
    const [originFirst, originLast] = this.originUrl.split(`/${this.originNS}/`)
    this.regexFilter = `^${escapeURLRegex(originFirst)}\\/${defaultNSRegexStr}\\/${RULE_REGEX_ENDING}`
    if (this.isBrave || isBraveOverride) {
      this.regexSubstitution = '\\1://\\2'
    } else {
      this.regexSubstitution = this.redirectUrl
        .replace(`/${this.redirectNS}/`, '/\\1/')
        .replace(originLast, '\\2')
    }
  }
}
