'use strict'
/* eslint-env browser, webextensions */
const browser = require('webextension-polyfill')
const createIpfsCompanion = require('../lib/ipfs-companion')
const { onInstalled } = require('../lib/on-installed')

// register onInstalled hook early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.ipfsCompanion = await createIpfsCompanion()
})
