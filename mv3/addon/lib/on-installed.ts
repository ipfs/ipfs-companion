'use strict'
/* eslint-env browser */

import browser from 'webextension-polyfill';
const { version } = browser.runtime.getManifest()

import { welcomePage, updatePage } from './constants';

export async function onInstalled (details) {
  // details.temporary === run via `npm run firefox`
  if (details.reason === 'install' || details.temporary) {
    await browser.storage.local.set({ onInstallTasks: 'onFirstInstall' })
  } else if (details.reason === 'update' || details.temporary) {
    await browser.storage.local.set({ onInstallTasks: 'onVersionUpdate' })
  }
}

export async function runPendingOnInstallTasks() {
  const { onInstallTasks, displayReleaseNotes } = await browser.storage.local.get(['onInstallTasks', 'displayReleaseNotes'])
  await browser.storage.local.remove('onInstallTasks')
  switch (onInstallTasks) {
    case 'onFirstInstall':
      return browser.tabs.create({
        url: welcomePage
      })
    case 'onVersionUpdate':
      if (!displayReleaseNotes) return
      await browser.storage.local.set({ dismissedUpdate: version })
      return browser.tabs.create({ url: updatePage + version })
  }
}
