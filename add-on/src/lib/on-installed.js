'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')
const { version } = browser.runtime.getManifest()

const { welcomePage } = require('./constants')
exports.updatePage = 'https://github.com/ipfs-shipyard/ipfs-companion/releases/tag/v'

exports.onInstalled = async (details) => {
  // details.temporary === run via `npm run firefox`
  if (details.reason === 'install' || details.temporary) {
    await browser.storage.local.set({ onInstallTasks: 'onFirstInstall' })
  } else if (details.reason === 'update' || details.temporary) {
    await browser.storage.local.set({ onInstallTasks: 'onVersionUpdate' })
  }
}

exports.runPendingOnInstallTasks = async () => {
  const { onInstallTasks, displayReleaseNotes } = await browser.storage.local.get(['onInstallTasks', 'displayReleaseNotes'])
  await browser.storage.local.remove('onInstallTasks')
  switch (onInstallTasks) {
    case 'onFirstInstall':
      await useNativeNodeIfFeasible(browser)
      return browser.tabs.create({
        url: welcomePage
      })
    case 'onVersionUpdate':
      if (!displayReleaseNotes) return
      await browser.storage.local.set({ dismissedUpdate: version })
      return browser.tabs.create({ url: exports.updatePage + version })
  }
}

async function useNativeNodeIfFeasible (browser) {
  // lazy-loaded dependencies due to debug package
  // depending on the value of localStorage.debug, which is set later
  const debug = require('debug')
  const log = debug('ipfs-companion:on-installed')
  log.error = debug('ipfs-companion:on-installed:error')
  const { brave, braveNodeType } = require('./ipfs-client/brave')
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
