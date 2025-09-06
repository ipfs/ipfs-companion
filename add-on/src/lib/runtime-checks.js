'use strict'
/* eslint-env browser, webextensions */

import debug from 'debug'

const log = debug('ipfs-companion:runtime-checks')

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

export default async function createRuntimeChecks (browser) {
  // browser
  const { name, version } = await getBrowserInfo(browser)
  const isFirefox = name && (name.includes('Firefox') || name.includes('Fennec'))
  const hasNativeProtocolHandler = !!(browser && browser.protocol && browser.protocol.registerStringProtocol) // TODO: chrome.ipfs support
  // Brave detection using modern navigator.brave API (available since 2020)
  let isBrave = false
  try {
    if (typeof navigator !== 'undefined' && navigator.brave && typeof navigator.brave.isBrave === 'function') {
      isBrave = await navigator.brave.isBrave()
      if (isBrave) {
        log('Detected Brave browser via navigator.brave.isBrave()')
      }
    }
  } catch (e) {
    // Failed to detect Brave, assuming false
  }
  // platform
  const platformInfo = await getPlatformInfo(browser)
  const isAndroid = platformInfo ? platformInfo.os === 'android' : false
  return Object.freeze({
    browser,
    isFirefox,
    isBrave,
    isAndroid,
    requiresXHRCORSfix: !!(isFirefox && version && version.startsWith('68')),
    hasNativeProtocolHandler
  })
}
