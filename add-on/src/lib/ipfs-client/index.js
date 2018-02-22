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
    await client.destroy()
    client = null
  }
}

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
