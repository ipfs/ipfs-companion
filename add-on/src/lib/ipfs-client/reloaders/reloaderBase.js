class ReloaderBase {

  /**
   * Constructor for reloader base class.
   *
   * @param {Browser} browser
   * @param {Logger} log
   */
  constructor(browser, log) {
    if (!browser || !log) {
      throw new Error('Instances of browser and logger are needed!');
    }
    this._browserInstance = browser;
    this._log = log;
  };

  /**
   * Initializes the instance.
   */
  init() {
    this._log('Initialized without additional config.');
  }

  /**
   * To be implemented in child class.
   */
  validation() {
    throw new Error('Validation: Method Not Implemented');
  }

  /**
   * To be implemented in child class.
   */
  message() {
    throw new Error('Message: Method Not Implemented');
  }

  /**
   * Handles reload for all tabs.
   * params {Array<tabs>}
   */
  reload(tabs) {
    tabs
      .filter(tab => this.validation(tab))
      .forEach(tab => {
        this._log(this.message(tab));
        this._browserInstance.tabs.reload(tab.id);
      });
  }
}

module.exports = {
  ReloaderBase
};
