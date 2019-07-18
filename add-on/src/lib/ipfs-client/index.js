'use strict'

/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

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
  preloadWebui(instance, opts)
  return instance
}

async function destroyIpfsClient () {
  if (client && client.destroy) {
    try {
      await client.destroy()
    } finally {
      client = null
    }
  }
}

function preloadWebui (instance, opts) {
  // run only when client still exists and async fetch is possible
  if (!(client && instance && opts.webuiRootUrl && typeof fetch === 'function')) return
  // Optimization: preload the root CID to speed up the first time
  // Web UI is opened. If embedded js-ipfs is used it will trigger
  // remote (always recursive) preload of entire DAG to one of preload nodes.
  // This way when embedded node wants to load resource related to webui
  // it will get it fast from preload nodes.
  const webuiUrl = opts.webuiRootUrl
  log(`preloading webui root at ${webuiUrl}`)
  return fetch(webuiUrl, { redirect: 'follow' })
    .then(response => {
      const webuiPath = new URL(response.url).pathname
      log(`preloaded webui root at ${webuiPath}`)
      // trigger recursive remote preload in js-ipfs
      instance.refs(webuiPath, { recursive: false })
    })
    .catch(err => log.error(`failed to preload webui root`, err))
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
