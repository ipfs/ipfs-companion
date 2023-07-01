'use strict'
/* eslint-env browser, webextensions */
import browser from 'webextension-polyfill'
import createIpfsCompanion from '../lib/ipfs-companion.js'
import { onInstalled } from '../lib/on-installed.js'
import { getUninstallURL } from '../lib/on-uninstalled.js'
import { debuggerInit } from '../lib/debugger/debugger.js'

// register lifecycle hooks early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)
browser.runtime.setUninstallURL(getUninstallURL(browser))

const init = async () => {
  await createIpfsCompanion()
  await debuggerInit()
}

init()
