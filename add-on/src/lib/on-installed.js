'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')

module.exports = function onRuntimeInstalled (details) {
  console.log('[ipfs-companion] onInstalled event', details)
  // details.temporary === run via `npm run firefox`
  if (details.reason === 'install' || details.temporary) {
    browser.tabs.create({
      url: '/dist/landing-pages/welcome/index.html'
    })
  }
}
