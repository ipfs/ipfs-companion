'use strict'

/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

const browser = require('webextension-polyfill')
const external = require('./external')
const embedded = require('./embedded')
const embeddedWithChromeSockets = require('./embedded-chromesockets')
const { precache } = require('../precache')

// ensure single client at all times, and no overlap between init and destroy
let client

async function initIpfsClient (opts) {
  log('init ipfs client')
  if (client) return // await destroyIpfsClient()
  let backend
  switch (opts.ipfsNodeType) {
    case 'embedded':
      backend = embedded
      break
    case 'embedded:chromesockets':
      backend = embeddedWithChromeSockets
      break
    case 'external':
      backend = external
      break
    default:
      throw new Error(`Unsupported ipfsNodeType: ${opts.ipfsNodeType}`)
  }
  const instance = await backend.init(opts)
  easeApiChanges(instance)
  _reloadIpfsClientDependents(instance, opts) // async (API is present)
  client = backend
  return instance
}

async function destroyIpfsClient () {
  log('destroy ipfs client')
  if (!client) return
  try {
    await client.destroy()
    await _reloadIpfsClientDependents() // sync (API stopped working)
  } finally {
    client = null
  }
}

function _isWebuiTab (url) {
  const bundled = !url.startsWith('http') && url.includes('/webui/index.html#/')
  const ipns = url.includes('/webui.ipfs.io/#/')
  return bundled || ipns
}

async function _reloadIpfsClientDependents (instance, opts) {
  // online || offline
  if (browser.tabs && browser.tabs.query) {
    const tabs = await browser.tabs.query({})
    if (tabs) {
      tabs.forEach((tab) => {
        // detect bundled webui in any of open tabs
        if (_isWebuiTab(tab.url)) {
          browser.tabs.reload(tab.id)
          log('reloading bundled webui')
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

// This enables use of dependencies without worrying if they already migrated to the new API.
function easeApiChanges (ipfs) {
  // no-op: used in past, not used atm
  // if (!ipfs) return
}

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
