'use strict'

const Ipfs = require('ipfs')
const WebExtMdns = require('libp2p-webext-mdns')
const WebExtTcp = require('libp2p-webext-tcp')
const { optionDefaults } = require('../options')

let node = null

exports.init = function init (opts) {
  console.log('[ipfs-companion] Embedded ipfs init')

  const ipfsOpts = Object.assign(
    JSON.parse(opts.ipfsNodeConfig || optionDefaults.ipfsNodeConfig),
    {
      libp2p: {
        modules: {
          peerDiscovery: [WebExtMdns],
          transport: [WebExtTcp]
        }
      }
    }
  )

  node = new Ipfs(ipfsOpts)

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
