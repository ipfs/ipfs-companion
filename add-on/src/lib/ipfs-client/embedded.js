'use strict'

const debug = require('debug')
const log = debug('ipfs-companion:client:embedded')
log.error = debug('ipfs-companion:client:embedded:error')

const mergeOptions = require('merge-options')
const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')

let node = null

exports.init = async function init (opts) {
  log('init')
  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const ipfsOpts = mergeOptions(defaultOpts, userOpts, { start: true })
  node = await Ipfs.create(ipfsOpts)
  return node
}

exports.destroy = async function () {
  log('destroy')
  if (!node) return

  await node.stop()
  node = null
}
