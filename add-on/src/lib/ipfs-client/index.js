'use strict'

const browser = require('webextension-polyfill')
const external = require('./external')
const embedded = require('./embedded')

let client

async function initIpfsClient (opts) {
  await destroyIpfsClient()

  if (opts.ipfsNodeType === 'embedded') {
    client = embedded
  } else {
    client = external
  }

  const instance = await client.init(opts)
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
          console.log('[ipfs-companion] reloading bundled webui')
        }
      })
    }
  }
}

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
