'use strict'
/* eslint-env browser, webextensions */

const { brave } = require('./ipfs-client/brave')

// this is our kitchen sink for runtime detection

function getBrowserInfo (browser) {
  // browser.runtime.getBrowserInfo is not available in Chromium-based browsers
  if (browser && browser.runtime && browser.runtime.getBrowserInfo) {
    return browser.runtime.getBrowserInfo()
  }
  return Promise.resolve({})
}

function getPlatformInfo (browser) {
  if (browser && browser.runtime && browser.runtime.getPlatformInfo) {
    return browser.runtime.getPlatformInfo()
  }
  return Promise.resolve()
}

function hasChromeSocketsForTcp () {
  // experimental Chrome Apps APIs safelisted by Brave as an experiment (superseded by chrome.ipfs.*)
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
  const { name, version } = await getBrowserInfo(browser)
  const isFirefox = name && (name.includes('Firefox') || name.includes('Fennec'))
  const hasNativeProtocolHandler = !!(browser && browser.protocol && browser.protocol.registerStringProtocol) // TODO: chrome.ipfs support
  // platform
  const platformInfo = await getPlatformInfo(browser)
  const isAndroid = platformInfo ? platformInfo.os === 'android' : false
  return Object.freeze({
    browser,
    brave, // easy Boolean(runtime.brave)
    isFirefox,
    isAndroid,
    isBrave: hasChromeSocketsForTcp(), // TODO: deprecated, remove chrome sockets, use brave instead
    requiresXHRCORSfix: !!(isFirefox && version && version.startsWith('68')),
    hasChromeSocketsForTcp: hasChromeSocketsForTcp(),
    hasNativeProtocolHandler
  })
}

module.exports.createRuntimeChecks = createRuntimeChecks
module.exports.hasChromeSocketsForTcp = hasChromeSocketsForTcp
