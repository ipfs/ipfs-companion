'use strict'

/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

const external = require('./external')
const embedded = require('./embedded')
const brave = require('./brave')
const { precache } = require('../precache')

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

function _isWebuiTab({ url }) {
  const bundled = !url.startsWith('http') && url.includes('/webui/index.html#/')
  const ipns = url.includes('/webui.ipfs.io/#/')
  return bundled || ipns
}

/**
 * Returns a promise that resolves to function that checks if the tab is a local gateway url.
 *
 * @param {browser} browser
 * @returns Promise<function(tab) => boolean>
 */
async function _isLocalGatewayUrlCheck (browser) {
  const { customGatewayUrl } = await browser.storage.local.get('customGatewayUrl');
  return function ({ url, title }) {
    // Check if the url is the local gateway url and if url is the same is title, it never got loaded.
    return url.startsWith(customGatewayUrl) && (url === title);
  };
}

/**
 * Returns a function that checks if the tab is an internal extension tab.
 *
 * @param {string} extensionOrigin
 * @returns function(tab) => boolean
 */
function _isInternalTabCheck (extensionOrigin) {
  return function ({ url }) {
    url.startsWith(extensionOrigin);
  };
}

async function reloadIpfsClientDependents (browser, instance, opts) {
  // online || offline
  if (browser.tabs && browser.tabs.query) {
    const tabs = await browser.tabs.query({})
    if (tabs) {
      const extensionOrigin = browser.runtime.getURL('/')
      const isLocalGatewayUrlDown = await _isLocalGatewayUrlCheck(browser);
      const isInternalTab = _isInternalTabCheck(extensionOrigin);
      tabs.forEach((tab) => {
        // detect bundled webui in any of open tabs
        if (_isWebuiTab(tab)) {
          log(`reloading webui at ${tab.url}`)
          browser.tabs.reload(tab.id)
        } else if (isInternalTab(tab)) {
          log(`reloading internal extension page at ${tab.url}`)
          browser.tabs.reload(tab.id)
        } else if (isLocalGatewayUrlDown(tab)) {
          log(`reloading local gateway at ${tab.url}`)
          browser.tabs.reload(tab.id);
        }
      })
    }
  }
  // online only
  if (client && instance && opts) {
    // add important data to local ipfs repo for instant load
    setTimeout(() => precache(instance, opts), 5000)
  }
}

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
exports.reloadIpfsClientDependents = reloadIpfsClientDependents
