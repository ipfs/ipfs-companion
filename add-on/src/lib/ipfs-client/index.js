'use strict'

/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

const browser = require('webextension-polyfill')
const external = require('./external')
const embedded = require('./embedded')
const embeddedWithChromeSockets = require('./embedded-chromesockets')

let client

async function initIpfsClient (opts) {
  log('init ipfs client')
  await destroyIpfsClient()
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
  _reloadIpfsClientDependents() // async (API is present)
  return instance
}

async function destroyIpfsClient () {
  if (client && client.destroy) {
    try {
      await client.destroy()
    } finally {
      client = null
      await _reloadIpfsClientDependents() // sync (API stopped working)
    }
  }
}

function _isWebuiTab (url) {
  const bundled = !url.startsWith('http') && url.includes('/webui/index.html#/')
  const ipns = url.includes('/webui.ipfs.io/#/')
  return bundled || ipns
}

async function _reloadIpfsClientDependents () {
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
}

const movedFilesApis = ['add', 'addPullStream', 'addReadableStream', 'cat', 'catPullStream', 'catReadableStream', 'get', 'getPullStream', 'getReadableStream']

// This enables use of dependencies without worrying if they already migrated to the new API.
function easeApiChanges (ipfs) {
  if (!ipfs) return
  // Handle the move of regular files api to top level
  // https://github.com/ipfs/interface-ipfs-core/pull/378
  // https://github.com/ipfs/js-ipfs/releases/tag/v0.34.0-pre.0
  movedFilesApis.forEach(cmd => {
    // Fix old backend (add new methods)
    if (typeof ipfs[cmd] !== 'function' && ipfs.files && typeof ipfs.files[cmd] === 'function') {
      ipfs[cmd] = ipfs.files[cmd]
      // console.log(`[ipfs-companion] fixed missing ipfs.${cmd}: added an alias for ipfs.files.${cmd}`)
    }
    // Fix new backend (add old methods)
    // This ensures ipfs-postmsg-proxy always works and can be migrated later
    if (ipfs.files && typeof ipfs.files[cmd] !== 'function' && typeof ipfs[cmd] === 'function') {
      ipfs.files[cmd] = ipfs[cmd]
      // console.log(`[ipfs-companion] fixed missing ipfs.files.${cmd}: added an alias for ipfs.${cmd}`)
    }
  })
}

exports.movedFilesApis = movedFilesApis
exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
