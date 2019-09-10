'use strict'

const debug = require('debug')
const log = debug('ipfs-companion:client:embedded')
log.error = debug('ipfs-companion:client:embedded:error')

const mergeOptions = require('merge-options')
const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')

let node = null

exports.init = function init (opts) {
  log('init')

  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const ipfsOpts = mergeOptions(defaultOpts, userOpts, { start: false })

  node = new Ipfs(ipfsOpts)

  return new Promise((resolve, reject) => {
    node.once('error', (error) => {
      log.error('something went terribly wrong during startup of js-ipfs!', error)
      reject(error)
    })
    node.once('ready', async () => {
      node.once('start', () => {
        resolve(node)
      })
      node.on('error', error => {
        log.error('something went terribly wrong in embedded js-ipfs!', error)
      })
      try {
        await node.start()
      } catch (err) {
        reject(err)
      }
    })
  })
}

exports.destroy = async function () {
  log('destroy')
  if (!node) return

  await node.stop()
  node = null
}
