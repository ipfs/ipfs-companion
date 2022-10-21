'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import { onInstalled } from '../lib/on-installed.js'
import { getUninstallURL } from '../lib/on-uninstalled.js'
import { optionDefaults } from '../lib/options.js'
import createIpfsCompanion from '../lib/ipfs-companion.js'

// register lifecycle hooks early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)
browser.runtime.setUninstallURL(getUninstallURL(browser))

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  // setting debug level early
  localStorage.debug = (await browser.storage.local.get({ logNamespaces: optionDefaults.logNamespaces })).logNamespaces
  // init inlined to read updated localStorage.debug
  window.ipfsCompanion = await createIpfsCompanion()
})
