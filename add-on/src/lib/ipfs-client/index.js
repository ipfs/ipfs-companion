'use strict'

/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

const browser = require('webextension-polyfill')
const mortice = require('mortice')
const external = require('./external')
const embedded = require('./embedded')
const embeddedWithChromeSockets = require('./embedded-chromesockets')
const { precache } = require('../precache')

// ensure single client at all times, and no overlap between init and destroy
// TODO: replace mortice with state machine?
const mutex = mortice('ipfs-client-lock')
let client

async function initIpfsClient (opts) {
  await destroyIpfsClient()
  const release = await mutex.writeLock()
  try {
    log('init ipfs client')
    switch (opts.ipfsNodeType) {
      case 'embedded':
        client = embedded
        break
      case 'embedded:chromesockets':
        client = embeddedWithChromeSockets
        break
      case 'external':
        client = external
        break
      default:
        throw new Error(`Unsupported ipfsNodeType: ${opts.ipfsNodeType}`)
    }

    const instance = await client.init(opts)
    easeApiChanges(instance)
    _reloadIpfsClientDependents(instance) // async (API is present)
    return instance
  } finally {
    release()
  }
}

async function destroyIpfsClient () {
  const release = await mutex.writeLock()
  log('destroy ipfs client')
  try {
    if (client && client.destroy) {
      try {
        await client.destroy()
      } finally {
        client = null
        await _reloadIpfsClientDependents() // sync (API stopped working)
      }
    }
  } finally {
    release()
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
  if (client && instance) {
    // add important data to local ipfs repo for instant load
    setTimeout(() => precache(instance), 10000)
  }
}

// This enables use of dependencies without worrying if they already migrated to the new API.
function easeApiChanges (ipfs) {
  // no-op: used in past, not used atm
  // if (!ipfs) return
}

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
