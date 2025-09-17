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
  // Firefox and forks that identify themselves differently
  // Note: Many forks (Tor Browser, LibreWolf, etc.) return "Firefox" for compatibility
  const isFirefox = name && /Firefox|Fennec|Waterfox/i.test(name)
  if (isFirefox) log('Detected Firefox browser via runtime.getBrowserInfo()')

  // Historical context: browser.protocol.registerStringProtocol was an experimental API
  // for native protocol handler support that existed in:
  // - Muon-based Brave (2017-2018): allowed registering handlers for ipfs:// URLs
  // - Mozilla's libdweb project (2018): experimental Firefox API for decentralized web protocols
  // Both projects were discontinued, but we keep this check for future use if any new
  // runtime implements native ipfs:// protocol support
  const hasNativeProtocolHandler = !!(browser && browser.protocol && browser.protocol.registerStringProtocol)

  // Brave detection using modern navigator.brave API (available since 2020)
  const isBrave = (typeof navigator !== 'undefined' && navigator.brave && await navigator.brave.isBrave?.()) || false
  if (isBrave) log('Detected Brave browser via navigator.brave.isBrave()')

  // platform
  const platformInfo = await getPlatformInfo(browser)
  const isAndroid = platformInfo ? platformInfo.os === 'android' : false
  if (isAndroid) log('Detected Android platform via runtime.getPlatformInfo()')

  return Object.freeze({
    browser,
    isFirefox,
    isBrave,
    isAndroid,
    requiresXHRCORSfix: !!(isFirefox && version && version.startsWith('68')),
    hasNativeProtocolHandler
  })
}
