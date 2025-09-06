'use strict'
/* eslint-env browser */

import browser from 'webextension-polyfill'
import { requestRequiredPermissionsPage, welcomePage } from './constants.js'

const { version } = browser.runtime.getManifest()
export const updatePage = 'https://github.com/ipfs-shipyard/ipfs-companion/releases/tag/v'

export async function onInstalled (details) {
  // details.temporary === run via `npm run firefox`
  if (details.reason === 'install' || details.temporary) {
    await browser.storage.local.set({ onInstallTasks: 'onFirstInstall' })
  } else if (details.reason === 'update' || details.temporary) {
    await browser.storage.local.set({ onInstallTasks: 'onVersionUpdate' })
  }
}

export async function runPendingOnInstallTasks () {
  const { onInstallTasks, displayReleaseNotes } = await browser.storage.local.get(['onInstallTasks', 'displayReleaseNotes'])
  await browser.storage.local.remove('onInstallTasks')
  // this is needed because `permissions.request` cannot be called from a script. If that happens the browser will
  // throws: Error: permissions.request may only be called from a user input handler
  // To avoid this, we open a new tab with the permissions page and ask the user to grant the permissions.
  // That makes the request valid and allows us to gain access to the permissions.
  if (!(await browser.permissions.contains({ origins: ['<all_urls>'] }))) {
    return browser.tabs.create({
      url: requestRequiredPermissionsPage
    })
  }
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
