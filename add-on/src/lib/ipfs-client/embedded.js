'use strict'

const debug = require('debug')
const log = debug('ipfs-companion:client:embedded')
log.error = debug('ipfs-companion:client:embedded:error')

const mergeOptions = require('merge-options')
const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')

let node = null

exports.init = async function init (browser, opts) {
  log('init')
  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const ipfsOpts = mergeOptions(defaultOpts, userOpts, { start: true })
  const missing = (array) => (!Array.isArray(array) || !array.length)
  const { Addresses } = ipfsOpts.config
  if (missing(Addresses.Swarm)) {
    Addresses.Swarm = [
      '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
      '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
    ]
  }
  if (missing(ipfsOpts.Delegates)) {
    Addresses.Delegates = [
      '/dns4/node0.delegate.ipfs.io/tcp/443/https',
      '/dns4/node1.delegate.ipfs.io/tcp/443/https',
      '/dns4/node2.delegate.ipfs.io/tcp/443/https',
      '/dns4/node3.delegate.ipfs.io/tcp/443/https'
    ]
  }
  node = await Ipfs.create(ipfsOpts)
  return node
}

exports.destroy = async function (browser) {
  log('destroy')
  if (!node) return

  await node.stop()
  node = null
}
