'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { onInstalled } = require('../lib/on-installed')
const { optionDefaults } = require('../lib/options')

// register onInstalled hook early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  // setting debug level early
  localStorage.debug = (await browser.storage.local.get({ logNamespaces: optionDefaults.logNamespaces })).logNamespaces
  // init inlined to read updated localStorage.debug
  const createIpfsCompanion = require('../lib/ipfs-companion')
  window.ipfsCompanion = await createIpfsCompanion()
})
