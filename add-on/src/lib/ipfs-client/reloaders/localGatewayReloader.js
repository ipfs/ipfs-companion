const { ReloaderBase } = require('./reloaderBase');

class LocalGatewayReloader extends ReloaderBase {

  /**
   * Constructor for LocalGatewayReloader class.
   *
   * @param {Browser} browser
   * @param {Logger} log
   */
  constructor(browser, log) {
    super(browser, log);
    this.customGatewayUrl = null;
  }

  /**
   * Fetching the customGatewayUrl from the local storage.
   */
  async init() {
    const { customGatewayUrl } = await this._browserInstance.storage.local.get('customGatewayUrl');
    this.customGatewayUrl = customGatewayUrl;
    this._log(`LocalGateway Reloader Ready for use.`);
  }

  validation({ url, title }) {
    // Check if the url is the local gateway url and if url is the same is title, it never got loaded.
    return url.startsWith(this.customGatewayUrl) && (url === title);
  }

  message({ url }) {
    return `reloading local gateway at ${url}`;
  }
}

module.exports = {
  LocalGatewayReloader
};
