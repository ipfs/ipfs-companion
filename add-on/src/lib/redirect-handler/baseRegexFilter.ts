import {brave} from '../../lib/ipfs-client/brave.js'

export interface IRegexFilter {
  originUrl: string
  redirectUrl: string
}

export interface IFilter {
  regexFilter: string
  regexSubstitution: string
}

/**
 * Base class for all regex filters.
 */
export class RegexFilter {
  readonly _redirectUrl!: string
  readonly _originUrl!: string
  readonly originURL: URL
  readonly redirectURL: URL
  readonly originNS: string
  readonly redirectNS: string
  readonly isBrave: boolean = brave !== undefined
  // by default we cannot handle the request.
  private _canHandle = false
  regexFilter!: string
  regexSubstitution!: string

  constructor ({ originUrl, redirectUrl }: IRegexFilter) {
    this._originUrl = originUrl
    this._redirectUrl = redirectUrl
    this.originURL = new URL(this._originUrl)
    this.redirectURL = new URL(this._redirectUrl)
    this.redirectNS = this.computeNamespaceFromUrl(this.redirectURL)
    this.originNS = this.computeNamespaceFromUrl(this.originURL)
    this.computeFilter()
    this.normalizeRegexFilter()
  }

  /**
   * Getter for the originUrl provided at construction.
   */
  get originUrl (): string {
    return this._originUrl
  }

  /**
   * Getter for the redirectUrl provided at construction.
   */
  get redirectUrl (): string {
    return this._redirectUrl
  }

  /**
   * Getter for the canHandle flag.
   */
  get canHandle (): boolean {
    return this._canHandle
  }

  /**
   * Setter for the canHandle flag.
   */
  set canHandle (value: boolean) {
    this._canHandle = value
  }

  /**
   * Getter for the filter. This is the regex filter and substitution.
   */
  get filter (): IFilter {
    if (!this.canHandle) {
      throw new Error('Cannot handle this request')
    }

    return {
      regexFilter: this.regexFilter,
      regexSubstitution: this.regexSubstitution
    }
  }

  /**
   * Compute the regex filter and substitution.
   * This is the main method that needs to be implemented by subclasses.
   * isBraveOverride is used to force the filter to be generated for Brave. For testing purposes only.
   */
  computeFilter (isBraveOverride?: boolean): void {
    throw new Error('Method not implemented.')
  }

  /**
   * Normalize the regex filter. This is a helper method that can be used by subclasses.
   */
  normalizeRegexFilter (): void {
    this.regexFilter = this.regexFilter.replace(/https?\??/ig, 'https?')
  }

  /**
   * Compute the namespace from the URL. This finds the first path segment.
   * e.g. http://<gateway>/<namespace>/path/to/file/or/cid
   *
   * @param url URL
   */
  computeNamespaceFromUrl ({ pathname }: URL): string {
    // regex to match the first path segment.
    return (/\/([^/]+)\//i.exec(pathname)?.[1] ?? '').toLowerCase()
  }
}
