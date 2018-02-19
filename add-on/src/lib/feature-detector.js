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

async function createFeatureDetector (getState, browser) {
  // browser
  const browserInfo = await getBrowserInfo(browser)
  const runtimeBrowserName = browserInfo ? browserInfo.name : 'unknown'
  const runtimeIsFirefox = !!runtimeBrowserName.match('Firefox')
  const runtimeHasNativeProtocol = !!(browser && browser.protocol && browser.protocol.registerStringProtocol)
  // platform
  const platformInfo = await getPlatformInfo(browser)
  const runtimeIsAndroid = platformInfo ? platformInfo.os === 'android' : false
  //
  return {
    getState () {
      return getState()
    },

    inFirefox () {
      return runtimeIsFirefox
    },

    inAndroid () {
      return runtimeIsAndroid
    },

    embeddedNodeIsActive () {
      return getState().ipfsNodeType === 'embedded'
    },

    inBrowserWithNativeProtocol () {
      return runtimeHasNativeProtocol
    }
  }
}

module.exports = createFeatureDetector
