const { ReloaderBase } = require('./reloaderBase')

class InternalTabReloader extends ReloaderBase {
  /**
   * Setting up the extension origin.
   */
  init () {
    this.extensionOrigin = this._browserInstance.runtime.getURL('/')
    this._log('InternalTabReloader Ready for use.')
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
