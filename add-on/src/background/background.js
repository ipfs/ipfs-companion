'use strict'
/* eslint-env browser, webextensions */

chrome.storage.local.debug = 'libp2p:*'

const createIpfsCompanion = require('../lib/ipfs-companion')

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.ipfsCompanion = await createIpfsCompanion()
})
