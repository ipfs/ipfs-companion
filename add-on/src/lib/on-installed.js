'use strict'
/* eslint-env browser */

import browser from 'webextension-polyfill'
import debug from 'debug'
import { requestRequiredPermissionsPage, welcomePage } from './constants.js'
import { brave, braveNodeType } from './ipfs-client/brave.js'

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
      await useNativeNodeIfFeasible(browser)
      return browser.tabs.create({
        url: welcomePage
      })
    case 'onVersionUpdate':
      if (!displayReleaseNotes) return
      await browser.storage.local.set({ dismissedUpdate: version })
      return browser.tabs.create({ url: updatePage + version })
  }
}

async function useNativeNodeIfFeasible (browser) {
  // lazy-loaded dependencies due to debug package
  // depending on the value of localStorage.debug, which is set later
  const log = debug('ipfs-companion:on-installed')
  log.error = debug('ipfs-companion:on-installed:error')
  const { ipfsNodeType, ipfsApiUrl } = await browser.storage.local.get(['ipfsNodeType', 'ipfsApiUrl'])

  // Brave >= v1.19 (https://brave.com/ipfs-support/)
  if (typeof brave !== 'undefined' && ipfsNodeType !== braveNodeType) {
    try {
      log(`brave detected, but node type is ${ipfsNodeType}. testing external endpoint at ${ipfsApiUrl}`)
      const response = await (await fetch(`${ipfsApiUrl}/api/v0/id`, { method: 'post' })).json()
      if (typeof response.ID === 'undefined') throw new Error(`unable to read PeerID from API at ${ipfsApiUrl}`)
      log(`endpoint is online, PeerID is ${response.ID}, nothing to do`)
    } catch (e) {
      log.error(`endpoint ${ipfsApiUrl} does not work`, e)
      log('switching node type to one provided by brave')
      await browser.storage.local.set({ ipfsNodeType: braveNodeType })
    }
  }
}
