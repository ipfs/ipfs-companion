'use strict'
/* eslint-env browser, webextensions */

const createIpfsCompanion = require('../lib/ipfs-companion')

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === browser.runtime.OnInstalledReason.INSTALL) {
    setTimeout(() => browser.tabs.create({
      'url': browser.extension.getURL('dist/landing-pages/landing-page.html')
    }), 1000)
  }
})

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.ipfsCompanion = await createIpfsCompanion()
})
