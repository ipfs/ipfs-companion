'use strict'
/* eslint-env browser, webextensions */

// Enable some debug output from js-ipfs
// (borrowed from https://github.com/ipfs-shipyard/ipfs-companion/pull/557)
// to include everything (mplex, libp2p, mss): localStorage.debug = '*'
localStorage.debug = 'jsipfs*,ipfs*,-*:mfs*,-*:ipns*,-ipfs:preload*'

const browser = require('webextension-polyfill')
const createIpfsCompanion = require('../lib/ipfs-companion')
const { onInstalled } = require('../lib/on-installed')

// register onInstalled hook early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.ipfsCompanion = await createIpfsCompanion()
})
