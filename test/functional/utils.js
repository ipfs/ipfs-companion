'use strict'
/* eslint-env mocha */

// The geckodriver package downloads and installs geckodriver for us.
// We use it by requiring it.
require('geckodriver')

let firefox = require('selenium-webdriver/firefox')
let webdriver = require('selenium-webdriver')
let FxRunnerUtils = require('fx-runner/lib/utils')
let Fs = require('fs-promise')
let By = webdriver.By
let Context = firefox.Context
let until = webdriver.until
let path = require('path')

// Note: Geckodriver already has quite a good set of default preferences
// for disabling various items.
// https://github.com/mozilla/geckodriver/blob/master/src/marionette.rs
const FIREFOX_PREFERENCES = {
  // Ensure e10s is turned on.
  'browser.tabs.remote.autostart': true,
  'browser.tabs.remote.autostart.1': true,
  'browser.tabs.remote.autostart.2': true,
  // These are good to have set up if you're debugging tests with the browser
  // toolbox.
  'devtools.chrome.enabled': true,
  'devtools.debugger.remote-enabled': true
}

function promiseActualBinary (binary) {
  return FxRunnerUtils.normalizeBinary(binary)
    .then(binary => Fs.stat(binary).then(() => binary))
    .catch(ex => {
      if (ex.code === 'ENOENT') {
        throw new Error('Could not find' + binary)
      }
      throw ex
    })
}

module.exports.promiseSetupDriver = () => {
  let profile = new firefox.Profile()

  Object.keys(FIREFOX_PREFERENCES).forEach(key => {
    profile.setPreference(key, FIREFOX_PREFERENCES[key])
  })

  let options = new firefox.Options()
  options.setProfile(profile)

  let builder = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)

  return promiseActualBinary(process.env.FIREFOX_BINARY || 'firefox')
    .then(binaryLocation => options.setBinary(new firefox.Binary(binaryLocation)))
    .then(() => builder.buildAsync())
    .then(driver => {
      driver.setContext(Context.CHROME)

      let fileLocation = path.join(process.cwd(), 'build/ipfs_gateway_redirect_wx-2.0.0.zip')
      // let fileLocation = path.join(process.cwd(), process.env.XPI_NAME);

      // This manually installs the add-on as a temporary add-on.
      // Hopefully selenium/geckodriver will get a way to do this soon:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1298025
      return driver.executeAsyncScript(
        "let fileUtils = Components.utils.import('resource://gre/modules/FileUtils.jsm');" +
        'let FileUtils = fileUtils.FileUtils;' +
        'let callback = arguments[arguments.length - 1];' +
        "Components.utils.import('resource://gre/modules/AddonManager.jsm');" +

        'let listener = {' +
        '  onInstallEnded: function(install, addon) {' +
        '    callback([addon.id, 0]);' +
        '  },' +

        '  onInstallFailed: function(install) {' +
        '    callback([null, install.error]);' +
        '  },' +

        '  onInstalled: function(addon) {' +
        '    AddonManager.removeAddonListener(listener);' +
        '    callback([addon.id, 0]);' +
        '  }' +
        '};' +

        'let file = new FileUtils.File(arguments[0]);' +

        'AddonManager.addAddonListener(listener);' +
        'AddonManager.installTemporaryAddon(file).catch(error => {' +
        '  Components.utils.reportError(error); callback([null, error])' +
        '});',
        fileLocation)
        .then(result => {
          if (!result[0] && result[1]) {
            return driver.quit().then(() => {
              throw new Error(`Failed to install add-on: ${result[1]}`)
            })
          }

          return driver
        })
    })
}

module.exports.promiseAddonButton = driver => {
  driver.setContext(Context.CHROME)
  return driver.wait(until.elementLocated(
    By.css("toolbarbutton[label='IPFS Gateway Redirect']")), 100000)
}
