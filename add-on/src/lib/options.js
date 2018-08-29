'use strict'

exports.optionDefaults = Object.freeze({
  active: true, // global ON/OFF switch, overrides everything else
  ipfsNodeType: 'external', // or 'embedded'
  ipfsNodeConfig: JSON.stringify({
    config: {
      Addresses: {
        Swarm: []
      }
    }
  }, null, 2),
  publicGatewayUrl: 'https://ipfs.io',
  useCustomGateway: true,
  automaticMode: true,
  linkify: false,
  dnslinkPolicy: 'best-effort',
  detectIpfsPathHeader: true,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000,
  ipfsProxy: true
})

// `storage` should be a browser.storage.local or similar
exports.storeMissingOptions = (read, defaults, storage) => {
  const requiredKeys = Object.keys(defaults)
  const changes = new Set()
  requiredKeys.map(key => {
    // limit work to defaults and missing values
    if (!read.hasOwnProperty(key) || read[key] === defaults[key]) {
      changes.add(new Promise((resolve, reject) => {
        storage.get(key).then(data => {
          if (!data[key]) { // detect and fix key without value in storage
            let option = {}
            option[key] = defaults[key]
            storage.set(option)
              .then(data => { resolve(`updated:${key}`) })
              .catch(error => { reject(error) })
          } else {
            resolve(`nochange:${key}`)
          }
        })
      }))
    }
  })
  return Promise.all(changes)
}

function normalizeGatewayURL (url) {
  // https://github.com/ipfs/ipfs-companion/issues/328
  return url
    .replace('/localhost:', '/127.0.0.1:')
}

exports.normalizeGatewayURL = normalizeGatewayURL

exports.migrateOptions = async (storage) => {
  // <= v2.4.4
  // DNSLINK: convert old on/off 'dnslink' flag to text-based 'dnslinkPolicy'
  const { dnslink } = await storage.get('dnslink')
  if (dnslink) {
    console.log(`[ipfs-companion] migrating old dnslink policy '${dnslink}' to 'best-effort'`)
    await storage.set({
      dnslinkPolicy: 'best-effort',
      detectIpfsPathHeader: true
    })
    await storage.remove('dnslink')
  }
}
