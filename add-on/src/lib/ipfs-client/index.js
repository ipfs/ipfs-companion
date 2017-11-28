'use strict'

const embedded = require('./embedded')
const external = require('./external')

let client = null

exports.initIpfsClient = async function (opts) {
  if (client && client.destroy) {
    await client.destroy()
  }

  if (opts.ipfsNodeType === 'embedded') {
    client = await embedded.init(opts)
  } else {
    client = await external.init(opts)
  }

  return client
}
