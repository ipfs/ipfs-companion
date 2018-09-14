'use strict'
/* eslint-env browser, webextensions */

function getBrowserInfo (browser) {
  if (browser && browser.runtime && browser.runtime.getBrowserInfo) {
    return browser.runtime.getBrowserInfo()
  }
  return Promise.resolve()
}

function getPlatformInfo (browser) {
  if (browser && browser.runtime && browser.runtime.getPlatformInfo) {
    return browser.runtime.getPlatformInfo()
  }
  return Promise.resolve()
}

async function createRuntimeChecks (browser) {
  // browser
  const browserInfo = await getBrowserInfo(browser)
  const runtimeBrowserName = browserInfo ? browserInfo.name : 'unknown'
  const runtimeIsFirefox = !!runtimeBrowserName.match('Firefox')
  const runtimeHasNativeProtocol = !!(browser && browser.protocol && (browser.protocol.registerProtocol || browser.protocol.registerStringProtocol))
  // platform
  const platformInfo = await getPlatformInfo(browser)
  const runtimeIsAndroid = platformInfo ? platformInfo.os === 'android' : false
  //
  return Object.freeze({
    browser,
    isFirefox: runtimeIsFirefox,
    isAndroid: runtimeIsAndroid,
    hasNativeProtocolHandler: runtimeHasNativeProtocol
  })
}

module.exports = createRuntimeChecks
