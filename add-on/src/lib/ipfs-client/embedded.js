'use strict'

const mergeOptions = require('merge-options')
const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')

let node = null

exports.init = function init (opts) {
  console.log('[ipfs-companion] Embedded ipfs init')

  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const ipfsOpts = mergeOptions.call({ concatArrays: true }, defaultOpts, userOpts, { start: false })

  node = new Ipfs(ipfsOpts)

  return new Promise((resolve, reject) => {
    node.once('error', (error) => {
      console.error('[ipfs-companion] Something went terribly wrong during startup of js-ipfs!', error)
      reject(error)
    })
    node.once('ready', async () => {
      node.on('start', () => {
        resolve(node)
      })
      node.on('error', error => {
        console.error('[ipfs-companion] Something went terribly wrong in embedded js-ipfs!', error)
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
  console.log('[ipfs-companion] Embedded ipfs destroy')
  if (!node) return

  await node.stop()
  node = null
}
