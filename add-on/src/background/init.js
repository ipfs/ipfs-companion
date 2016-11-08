'use strict'
/* eslint-env webextensions */

var ipfsApi
const isIpfs = window.IsIpfs

const optionDefaults = {
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001'
}

function init () {
  withOptions((options) => {
    ipfsApi = initIpfsApi(options.ipfsApiUrl)
    smokeTestLibs()
    saveDefaultOptions(options)
  })
}

function initIpfsApi (ipfsApiUrl) {
  const parsed = document.createElement('a') // oh goddess why
  parsed.href = ipfsApiUrl
  const apiHost = parsed.hostname
  const apiPort = parsed.port
  const apiProtocol = parsed.protocol.split(':')[0]
  parsed.remove()
  console.log(window)
  return window.IpfsApi({host: apiHost, port: apiPort, procotol: apiProtocol})
}

function smokeTestLibs () {
  // is-ipfs
  console.log('is-ipfs library test (should be true) --> ' + isIpfs.multihash('QmUqRvxzQyYWNY6cD1Hf168fXeqDTQWwZpyXjU5RUExciZ'))
  // ipfs-api: execute test request :-)
  ipfsApi.id().then(function (id) {
    console.log('ipfs-api .id() test --> Node ID is: ', id)
  }).catch(function (err) {
    console.log('ipfs-api .id() test --> Failed to read Node info: ', err)
  })
}

function withOptions (callback) {
  chrome.storage.local.get(optionDefaults, (data) => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError)
    } else {
      callback(data)
    }
  })
}

function saveDefaultOptions (readOptions) {
  for (let key in readOptions) {
    // inspect values which match defaults
    if (readOptions[key] === optionDefaults[key]) {
      // read value without fallback
      chrome.storage.local.get(key, (data) => {
        // save default value if data is missing
        if (!data[key]) {
          let option = {}
          option[key] = optionDefaults[key]
          chrome.storage.local.set(option)
        }
      })
    }
  }
}

function onStorageChange (changes, area) {
  for (let key in changes) {
    let change = changes[key]
    if (change.oldValue !== change.newValue) {
      if (key === 'ipfsApiUrl') {
        ipfsApi = initIpfsApi(change.newValue)
      }

      // debug
      console.log('Storage key "%s" in namespace "%s" changed. ' +
      'Old value was "%s", new value is "%s".',
        key,
        area,
        change.oldValue,
        change.newValue)
    }
  }
}

// init during addon startup
window.onload = init
// start tracking storage changes (user options etc)
chrome.storage.onChanged.addListener(onStorageChange)
