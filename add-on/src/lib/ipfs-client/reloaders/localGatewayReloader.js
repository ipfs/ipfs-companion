const { ReloaderBase } = require('./reloaderBase')

class LocalGatewayReloader extends ReloaderBase {
  /**
   * Constructor for LocalGatewayReloader class.
   *
   * @param {Browser} browser
   * @param {Logger} log
   */
  constructor (browser, log) {
    super(browser, log)
    this.customGatewayUrl = null
  }

  /**
   * Fetching the customGatewayUrl from the local storage.
   */
  async init () {
    const { customGatewayUrl } = await this._browserInstance.storage.local.get('customGatewayUrl')
    this.customGatewayUrl = customGatewayUrl
    this._log('LocalGateway Reloader Ready for use.')
  }

  validation ({ url, title }) {
    // Check if the url is the local gateway url and if the title is contained within the url then it was not loaded.
    //
    // - This assumes that the title of most pages on the web will be set and hence when not reachable, the browser
    //   will set title to the url/host (both chrome and brave) and 'problem loading page' for firefox.
    // - There is probability that this might be true in case the <title> tag is omitted, but worst case it only reloads
    //   those pages.
    // - The benefit we get from this approach is the static nature of just observing the tabs in their current state.
    //   which reduces the overhead of injecting content scripts to track urls that were loaded after the connection
    //   was offline, it may also need extra permissions to inject code on error pages.
    return url.startsWith(this.customGatewayUrl) &&
      (url.includes(title) || title.toLowerCase() === 'problem loading page')
  }

  message ({ url }) {
    return `reloading local gateway at ${url}`
  }
}

module.exports = {
  LocalGatewayReloader
}
