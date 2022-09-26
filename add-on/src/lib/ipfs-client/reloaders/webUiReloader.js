const { ReloaderBase } = require('./reloaderBase')

class WebUiReloader extends ReloaderBase {
  /**
   * Performs url validation for the tab. If tab is a WebUI tab.
   *
   * @param {Object} tab
   * @returns {boolean}
   */
  validation ({ url }) {
    const bundled = !url.startsWith('http') && url.includes('/webui/index.html#/')
    const ipns = url.includes('/webui.ipfs.io/#/')
    return bundled || ipns
  }

  /**
   * Returns message when reloading the tab.
   *
   * @param {Object} tab
   * @param {string} tab.url
   * @returns {string} message.
   */
  message ({ url }) {
    return `reloading webui at ${url}`
  }
}

module.exports = {
  WebUiReloader
}
