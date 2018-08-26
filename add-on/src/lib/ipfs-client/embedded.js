'use strict'

const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')
const log = require('../log')('api:embedded')

let node = null

exports.init = function init (opts) {
  log('IPFS init using embedded js-ipfs')

  node = new Ipfs(
    JSON.parse(opts.ipfsNodeConfig || optionDefaults.ipfsNodeConfig)
  )

  if (node.isOnline()) {
    return Promise.resolve(node)
  }

  return new Promise((resolve, reject) => {
    // TODO: replace error listener after a 'ready' event.
    node.once('error', (err) => reject(err))
    node.once('ready', () => resolve(node))
  })
}

exports.destroy = async function () {
  log('js-ipfs node destroy')
  if (!node) return

  await node.stop()
  node = null
}
