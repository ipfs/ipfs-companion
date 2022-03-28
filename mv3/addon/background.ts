'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill';
import { onInstalled } from './lib/on-installed';
import { getUninstallURL } from './lib/on-uninstalled';
import { init as createIpfsCompanion} from './lib/ipfs-companion';

// register lifecycle hooks early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)
browser.runtime.setUninstallURL(getUninstallURL(browser))

// init add-on after all libs are loaded
async function initializeBackgroundScript () {
  // setting debug level early
  // localStorage.debug = (await browser.storage.local.get({ logNamespaces: optionDefaults.logNamespaces })).logNamespaces;
  // init inlined to read updated localStorage.debug
  browser.ipfsCompanion = await createIpfsCompanion();
}

initializeBackgroundScript();
