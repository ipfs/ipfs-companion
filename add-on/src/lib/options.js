'use strict'

const optionDefaults = Object.freeze({
  publicGatewayUrl: 'https://ipfs.io',
  useCustomGateway: true,
  automaticMode: true,
  linkify: false,
  dnslink: false,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  customGatewayUrl: 'http://localhost:8080',
  ipfsApiUrl: 'http://localhost:5001',
  ipfsApiPollMs: 3000
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
  // https://github.com/ipfs/ipfs-companion/issues/291
  return url
    .replace('/127.0.0.1:', '/localhost:')
    .replace('/gateway.ipfs.io', '/ipfs.io')
}

exports.normalizeGatewayURL = normalizeGatewayURL
