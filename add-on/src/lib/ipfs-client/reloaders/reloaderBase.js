class ReloaderBase {

  constructor(browser, log) {
    if (!browser || !log) {
      throw new Error('Instances of browser and logger are needed!');
    }
    this._browserInstance = browser;
    this._log = log;
  };

  init() {
    this._log('Initialized Without Additional Params.');
  }

  validation() {
    throw new Error('Validation: Method Not Implemented');
  }

  message() {
    throw new Error('Message: Method Not Implemented');
  }

  reloadTab(tabId) {
    this._browserInstance.reload(tabId);
  }

  handle(tab) {
    if (this.validation(tab)) {
      this._log(this.message(tab));
      this._browserInstance.tabs.reload(tab.id)
    }
  }
}

function prepareReloadExtensions(extensions, browserInstance, loggerInstance) {
  return Promise.all(extensions
    .map(ext => new ext(browserInstance, loggerInstance))
    .map(async ext => await ext.init())
  );
}

exports = {
  ReloaderBase,
  prepareReloadExtensions
};
