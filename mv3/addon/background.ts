'use strict'
/* eslint-env browser, webextensions */

/**
 *
              _________________ _____
             |_   _| ___ \  ___/  ___|
               | | | |_/ / |_  \ `--.
               | | |  __/|  _|  `--. \
              _| |_| |   | |   /\__/ /
              \___/\_|   \_|   \____/
 _____                                   _
/  __ \                                 (_)
| /  \/ ___  _ __ ___  _ __   __ _ _ __  _  ___  _ __
| |    / _ \| '_ ` _ \| '_ \ / _` | '_ \| |/ _ \| '_ \
| \__/\ (_) | | | | | | |_) | (_| | | | | | (_) | | | |
 \____/\___/|_| |_| |_| .__/ \__,_|_| |_|_|\___/|_| |_|
                      | |
                      |_|
 *      https://github.com/ipfs/ipfs-companion
 **/

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
