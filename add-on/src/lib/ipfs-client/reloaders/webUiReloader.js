const { ReloaderBase } = require('./reloaderBase');

class WebUiReloader extends ReloaderBase {

  /**
   * Constructor for reloader base class.
   *
   * @param {Browser} browser
   * @param {Logger} log
   */
  constructor(browser, log) {
    super(browser, log);
  }

  validation({ url }) {
    const bundled = !url.startsWith('http') && url.includes('/webui/index.html#/');
    const ipns = url.includes('/webui.ipfs.io/#/');
    return bundled || ipns;
  }

  message({ url }) {
    return `reloading webui at ${url}`;
  }
}

module.exports = {
  WebUiReloader
};
