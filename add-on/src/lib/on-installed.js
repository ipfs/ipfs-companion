'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')

exports.welcomePage = '/dist/landing-pages/welcome/index.html'
exports.updatePage = 'https://github.com/ipfs-shipyard/ipfs-companion/releases/tag/v'

exports.onInstalled = async (details) => {
  // details.temporary === run via `npm run firefox`
  if (details.reason === 'install' || details.temporary) {
    await browser.storage.local.set({ showLandingPage: 'onInstallWelcome' })
  } else if (details.reason === 'update' || details.temporary) {
    await browser.storage.local.set({ showLandingPage: 'onVersionUpdate' })
  }
}

exports.showPendingLandingPages = async () => {
  const hint = await browser.storage.local.get([
    'showLandingPage',
    'displayReleaseNotes'
  ])
  switch (hint.showLandingPage) {
    case 'onInstallWelcome':
      await browser.storage.local.remove('showLandingPage')
      return browser.tabs.create({
        url: exports.welcomePage
      })
    case 'onVersionUpdate':
      await browser.storage.local.remove('showLandingPage')
      if (!hint.displayReleaseNotes) return
      return browser.tabs.create({
        url: exports.updatePage + browser.runtime.getManifest().version
      })
  }
}
