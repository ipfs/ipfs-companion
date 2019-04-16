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

function hasChromeSocketsForTcp () {
  return typeof chrome === 'object' &&
    typeof chrome.runtime === 'object' &&
    typeof chrome.runtime.id === 'string' &&
    typeof chrome.sockets === 'object' &&
    typeof chrome.sockets.tcpServer === 'object' &&
    typeof chrome.sockets === 'object' &&
    typeof chrome.sockets.tcp === 'object'
}

async function createRuntimeChecks (browser) {
  // browser
  const browserInfo = await getBrowserInfo(browser)
  const runtimeBrowserName = browserInfo ? browserInfo.name : 'unknown'
  const runtimeIsFirefox = !!(runtimeBrowserName.includes('Firefox') || runtimeBrowserName.includes('Fennec'))
  const runtimeHasNativeProtocol = !!(browser && browser.protocol && browser.protocol.registerStringProtocol)
  // platform
  const platformInfo = await getPlatformInfo(browser)
  const runtimeIsAndroid = platformInfo ? platformInfo.os === 'android' : false
  const runtimeHasSocketsForTcp = hasChromeSocketsForTcp()
  return Object.freeze({
    browser,
    isFirefox: runtimeIsFirefox,
    isAndroid: runtimeIsAndroid,
    isBrave: runtimeHasSocketsForTcp, // TODO: make it more robust
    hasChromeSocketsForTcp: runtimeHasSocketsForTcp,
    hasNativeProtocolHandler: runtimeHasNativeProtocol
  })
}

module.exports.createRuntimeChecks = createRuntimeChecks
module.exports.hasChromeSocketsForTcp = hasChromeSocketsForTcp
