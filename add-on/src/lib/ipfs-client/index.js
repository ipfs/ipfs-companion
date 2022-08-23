'use strict'

/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

const external = require('./external')
const embedded = require('./embedded')
const brave = require('./brave')
const { precache } = require('../precache')
const { prepareReloadExtensions, WebUiReloader, LocalGatewayReloader, InternalTabReloader } = require('./reloaders');

// ensure single client at all times, and no overlap between init and destroy
let client

async function initIpfsClient (browser, opts) {
  log('init ipfs client')
  if (client) return // await destroyIpfsClient()
  let backend
  switch (opts.ipfsNodeType) {
    case 'embedded:chromesockets':
      // TODO: remove this one-time migration after in second half of 2021
      setTimeout(async () => {
        log('converting embedded:chromesockets to native external:brave')
        opts.ipfsNodeType = 'external:brave'
        await browser.storage.local.set({
          ipfsNodeType: 'external:brave',
          ipfsNodeConfig: '{}' // remove chrome-apps config
        })
        await browser.tabs.create({ url: 'https://docs.ipfs.io/how-to/companion-node-types/#native' })
      }, 0)
      // Halt client init
      throw new Error('Embedded + chrome.sockets is deprecated. Switching to Native IPFS in Brave.')
    case 'embedded':
      backend = embedded
      break
    case 'external:brave':
      backend = brave
      break
    case 'external':
      backend = external
      break
    default:
      throw new Error(`Unsupported ipfsNodeType: ${opts.ipfsNodeType}`)
  }
  const instance = await backend.init(browser, opts)
  reloadIpfsClientDependents(browser, instance, opts) // async (API is present)
  client = backend
  return instance
}

async function destroyIpfsClient (browser) {
  log('destroy ipfs client')
  if (!client) return
  try {
    await client.destroy(browser)
    await reloadIpfsClientDependents(browser) // sync (API stopped working)
  } finally {
    client = null
  }
}

async function reloadIpfsClientDependents(
  browser, instance, opts, reloadExtensions = [WebUiReloader, LocalGatewayReloader, InternalTabReloader]) {
  // online || offline
  if (browser.tabs && browser.tabs.query) {
    const tabs = await browser.tabs.query({})
    if (tabs) {
      const reloadChecks = await prepareReloadExtensions(reloadExtensions, browser, log);
      reloadChecks.forEach(check => check.reload(tabs));
    }
  }

  // online only
  if (client && instance && opts) {
    // add important data to local ipfs repo for instant load
    setTimeout(() => precache(instance, opts), 5000)
  }
}

module.exports = {
  initIpfsClient,
  destroyIpfsClient,
  reloadIpfsClientOfflinePages: (...args) => reloadIpfsClientDependents(...args, [LocalGatewayReloader])
};
