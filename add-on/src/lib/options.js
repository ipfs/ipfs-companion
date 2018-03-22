'use strict'

const optionDefaults = Object.freeze({
  ipfsNodeType: 'external',
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
  dnslink: false,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000,
  ipfsProxy: true
})

exports.optionDefaults = optionDefaults

// `storage` should be a browser.storage.local or similar
function storeMissingOptions (read, defaults, storage) {
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

exports.storeMissingOptions = storeMissingOptions

function normalizeGatewayURL (url) {
  // https://github.com/ipfs/ipfs-companion/issues/328
  return url
    .replace('/localhost:', '/127.0.0.1:')
}

exports.normalizeGatewayURL = normalizeGatewayURL
