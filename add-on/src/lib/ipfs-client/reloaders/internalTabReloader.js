const { ReloaderBase } = require('./reloaderBase')

class InternalTabReloader extends ReloaderBase {
  /**
   * Constructor for InternalTabReloader class.
   *
   * @param {Browser} browser
   * @param {Logger} log
   */
  constructor (browser, log) {
    super(browser, log)
    this.extensionOrigin = null
  }

  /**
   * Setting up the extension origin.
   */
  init () {
    this.extensionOrigin = this._browserInstance.runtime.getURL('/')
    this._log('InternalTabReloader Reloader Ready for use.')
  }

  validation ({ url }) {
    return url.startsWith(this.extensionOrigin)
  }

  message ({ url }) {
    return `reloading internal extension page at ${url}`
  }
}

module.exports = {
  InternalTabReloader
}
