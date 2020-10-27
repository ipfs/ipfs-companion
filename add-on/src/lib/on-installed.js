'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')
const { version } = browser.runtime.getManifest()

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
  const { showLandingPage, displayReleaseNotes } = await browser.storage.local.get(['showLandingPage', 'displayReleaseNotes'])
  switch (showLandingPage) {
    case 'onInstallWelcome':
      await browser.storage.local.remove('showLandingPage')
      return browser.tabs.create({
        url: exports.welcomePage
      })
    case 'onVersionUpdate':
      await browser.storage.local.remove('showLandingPage')
      if (!displayReleaseNotes) return
      await browser.storage.local.set({ dismissedUpdate: version })
      return browser.tabs.create({ url: exports.updatePage + version })
  }
}
