import { RegexFilter } from './baseRegexFilter.js'
import { RULE_REGEX_ENDING, escapeURLRegex } from './blockOrObserve.js'

/**
 * Handles redirects like:
 * origin: '^https?\\:\\/\\/awesome\\.ipfs\\.io\\/(.*)'
 * destination: 'http://localhost:8081/ipns/awesome.ipfs.io/$1'
 */
export class CommonPatternRedirectRegexFilter extends RegexFilter {
  computeFilter (): void {
    // this filter is the worst case scenario, we can handle any redirect.
    this.canHandle = true
    // We can traverse the URL from the end, and find the first character that is different.
    let commonIdx = 1
    const leastLength = Math.min(this.originUrl.length, this.redirectUrl.length)
    while (commonIdx < leastLength) {
      if (this.originUrl[this.originUrl.length - commonIdx] !== this.redirectUrl[this.redirectUrl.length - commonIdx]) {
        break
      }
      commonIdx += 1
    }

    // We can now construct the regex filter and substitution.
    this.regexSubstitution = this.redirectUrl.slice(0, this.redirectUrl.length - commonIdx + 1) + '\\1'
    // We need to escape the characters that are allowed in the URL, but not in the regex.
    const regexFilterFirst = escapeURLRegex(this.originUrl.slice(0, this.originUrl.length - commonIdx + 1))
    this.regexFilter = `^${regexFilterFirst}${RULE_REGEX_ENDING}`
    // calling normalize should add the protocol in the regexFilter.
    this.normalizeRegexFilter()

    // This method does not parse:
    // originUrl: "https://awesome.ipfs.io/"
    // redirectUrl: "http://localhost:8081/ipns/awesome.ipfs.io/"
    // that ends up with capturing all urls which we do not want.
    // This rule can only apply to ipns subdomains.
    if (this.regexFilter === `^https?\\:\\/${RULE_REGEX_ENDING}`) {
      const subdomain = new URL(this.originUrl).hostname
      this.regexFilter = `^https?\\:\\/\\/${escapeURLRegex(subdomain)}${RULE_REGEX_ENDING}`
      this.regexSubstitution = this.regexSubstitution.replace('\\1', `/${subdomain}\\1`)
    }
  }
}
