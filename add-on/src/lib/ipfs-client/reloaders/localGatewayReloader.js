const { ReloaderBase } = require('./reloaderBase');

class LocalGatewayReloader extends ReloaderBase {
  constructor(...args) {
    super(...args);
    this.customGatewayUrl = null;
  }

  async init() {
    const { customGatewayUrl } = await this._browserInstance.storage.local.get('customGatewayUrl');
    this.customGatewayUrl = customGatewayUrl;
    this._log(`LocalGateway Reloader Read for use.`);
  }

  validation({ url, title }) {
    // Check if the url is the local gateway url and if url is the same is title, it never got loaded.
    return url.startsWith(this.customGatewayUrl) && (url === title);
  }

  message({ url }) {
    return `reloading local gateway at ${url}`;
  }
}

exports = {
  LocalGatewayReloader
};
