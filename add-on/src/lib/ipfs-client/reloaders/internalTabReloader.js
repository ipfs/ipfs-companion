const { ReloaderBase } = require('./reloaderBase');

class InternalTabReloader extends ReloaderBase {
  constructor(...args) {
    super(...args);
    this.extensionOrigin = null;
  }

  init() {
    this.extensionOrigin = this._browserInstance.runtime.getURL('/');
  }

  validation({ url }) {
    return url.startsWith(this.extensionOrigin);
  }

  message({ url }) {
    return `reloading internal extension page at ${url}`;
  }
}

exports = {
  InternalTabReloader
};
