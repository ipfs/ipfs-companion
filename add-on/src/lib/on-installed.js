'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')

exports.welcomePage = '/dist/landing-pages/welcome/index.html'

exports.onInstalled = async (details) => {
  // details.temporary === run via `npm run firefox`
  if (details.reason === 'install' || details.temporary) {
    await browser.storage.local.set({ showLandingPage: 'onInstallWelcome' })
  }
}

exports.showPendingLandingPages = async () => {
  const hint = await browser.storage.local.get('showLandingPage')
  switch (hint.showLandingPage) {
    case 'onInstallWelcome':
      await browser.storage.local.remove('showLandingPage')
      return browser.tabs.create({
        url: exports.welcomePage
      })
    // case 'onVersionUpdate'
  }
}
