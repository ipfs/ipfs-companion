'use strict'
/* eslint-env browser, webextensions */

var ipfs

const optionDefaults = Object.freeze({
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001'
})

function init () {
  const loadOptions = browser.storage.local.get(optionDefaults)
  return loadOptions
    .then(options => {
      ipfs = initIpfsApi(options.ipfsApiUrl)
      smokeTestLibs()
      return storeMissingOptions(options, optionDefaults)
    })
    .catch(error => {
      console.error(`Unable to initialize addon due to ${error}`)
    })
}

function initIpfsApi (ipfsApiUrl) {
  const url = new URL(ipfsApiUrl)
  return window.IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
}

function smokeTestLibs () {
  // is-ipfs
  console.info('is-ipfs library test (should be true) --> ' + window.IsIpfs.multihash('QmUqRvxzQyYWNY6cD1Hf168fXeqDTQWwZpyXjU5RUExciZ'))
  // ipfs-api: execute test request :-)
  ipfs.id()
    .then(function (id) {
      console.info('ipfs-api .id() test --> Node ID is: ', id)
    })
    .catch(function (err) {
      console.info('ipfs-api .id() test --> Failed to read Node info: ', err)
    })
}

function storeMissingOptions (read, defaults) {
  const requiredKeys = Object.keys(defaults)
  const changes = new Set()
  requiredKeys.map(key => {
    // limit work to defaults and missing values
    if (!read.hasOwnProperty(key) || read[key] === defaults[key]) {
      changes.add(new Promise((resolve, reject) => {
        browser.storage.local.get(key).then(data => {
          if (!data[key]) { // detect and fix key without value in storage
            let option = {}
            option[key] = defaults[key]
            browser.storage.local.set(option)
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

function onStorageChange (changes, area) {
  for (let key in changes) {
    let change = changes[key]
    if (change.oldValue !== change.newValue) {
      // debug info
      // console.info(`Storage key "${key}" in namespace "${area}" changed. Old value was "${change.oldValue}", new value is "${change.newValue}".`)
      if (key === 'ipfsApiUrl') {
        ipfs = initIpfsApi(change.newValue)
      }
    }
  }
}

// start tracking storage changes (user options etc)
browser.storage.onChanged.addListener(onStorageChange)

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', init)
