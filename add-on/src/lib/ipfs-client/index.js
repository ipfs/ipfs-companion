'use strict'

const external = require('./external')
const embedded = require('./embedded')

let client = null

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
    return client.destroy()
  }
}

exports.initIpfsClient = initIpfsClient
exports.destroyIpfsClient = destroyIpfsClient
