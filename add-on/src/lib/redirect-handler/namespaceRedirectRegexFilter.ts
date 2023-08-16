import { DEFAULT_NAMESPACES, RULE_REGEX_ENDING, defaultNSRegexStr, escapeURLRegex } from './blockOrObserve.js'
import { IRegexFilter, RegexFilter } from './baseRegexFilter.js'

export class NamespaceRedirectRegexFilter extends RegexFilter {
  constructor ({ originUrl, redirectUrl }: IRegexFilter) {
    super({ originUrl, redirectUrl })
    this._canHandle = DEFAULT_NAMESPACES.has(this.originNS) &&
      DEFAULT_NAMESPACES.has(this.redirectNS) &&
      this.originNS === this.redirectNS &&
      this.originURL.searchParams.get('uri') == null
  }

  computeFilter (): void {
    // if the namespaces are the same, we can generate simpler regex.
    // The only value that needs special handling is the `uri` param.
    // A redirect like
    // https://ipfs.io/ipfs/QmZMxU -> http://localhost:8080/ipfs/QmZMxU
    const [originFirst, originLast] = this.originUrl.split(`/${this.originNS}/`)
    this.regexFilter = `^${escapeURLRegex(originFirst)}\\/${defaultNSRegexStr}\\/${RULE_REGEX_ENDING}`
    this.regexSubstitution = this.redirectUrl
      .replace(`/${this.redirectNS}/`, '/\\1/')
      .replace(originLast, '\\2')
  }
}
