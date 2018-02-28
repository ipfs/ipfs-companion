'use strict'

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

  return client.init(opts)
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

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
