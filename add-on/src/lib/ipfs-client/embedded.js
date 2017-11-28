const Ipfs = require('ipfs')
const IpfsApi = require('ipfs-api')

let node = null

exports.init = function init () {
  console.log('[ipfs-companion] Embedded ipfs init')

  const ipfsJs = new Ipfs({
    config: {
      Addresses: {
        Swarm: []
      }
    }
  })

  node = createApiAdaptor(ipfsJs)

  if (node.isOnline()) {
    return Promise.resolve(node)
  }

  return new Promise((resolve, reject) => {
    // TODO: replace error listener after a 'ready' event.
    node.once('error', (err) => reject(err))
    node.once('ready', () => resolve(node))
  })
}

// Create a minimal ipfsApi adaptor, so we can use an ipfsJs node in place of an ipfsApi.
function createApiAdaptor (ipfs) {
  const ipfsApiLite = new Proxy(ipfs, {
    get: (ipfs, prop) => {
      if (prop === 'Buffer') {
        return IpfsApi.Buffer
      }
      return ipfs[prop]
    }
  })
  return ipfsApiLite
}

exports.destroy = async function () {
  if (!node) return

  await node.stop()
  node = null
}
