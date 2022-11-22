import ReloaderBase from './reloaderBase.js'

export default class InternalTabReloader extends ReloaderBase {
  /**
   * Setting up the extension origin.
   */
  init () {
    this.extensionOrigin = this._browserInstance.runtime.getURL('/')
    this._log('InternalTabReloader Ready for use.')
  }

  /**
   * Performs url validation for the tab. If tab is a WebUI tab.
   *
   * @param {Object} tab
   * @param {string} tab.url
   * @returns {boolean}
   */
  validation ({ url }) {
    return url.startsWith(this.extensionOrigin)
  }

  /**
   * Returns message when reloading the tab.
   *
   * @param {Object} tab
   * @param {string} tab.url
   * @returns {string} message.
   */
  message ({ url }) {
    return `reloading internal extension page at ${url}`
  }
}
