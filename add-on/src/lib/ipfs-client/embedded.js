'use strict'

const Ipfs = require('ipfs')

let node = null

exports.init = function init () {
  console.log('[ipfs-companion] Embedded ipfs init')

  node = new Ipfs({
    config: {
      Addresses: {
        Swarm: []
      }
    }
  })

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
  console.log('[ipfs-companion] Embedded ipfs destroy')
  if (!node) return

  await node.stop()
  node = null
}
