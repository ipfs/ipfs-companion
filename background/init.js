/* global chrome */
var ipfsApi, isIpfs
const optionDefaults = {
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001'
}

function init () {
  console.log('Initializing IPFS Support')
  // ipfs-api
  withOptions((options) => {
    // is-ipfs
    isIpfs = initIsIpfs()
    console.log('is-ipfs library test (should be true) --> ' + isIpfs.multihash('QmUqRvxzQyYWNY6cD1Hf168fXeqDTQWwZpyXjU5RUExciZ'))
    // ipfs-api
    ipfsApi = initIpfsApi(options.ipfsApiUrl)
    // execute test request :-)
    ipfsApi.id().then(function (id) {
      console.log('ipfs-api .id() test --> Node ID is: ', id)
    }).catch(function (err) {
      console.log('ipfs-api .id() test --> Failed to read Node info: ', err)
    })
    // persist any newly discovered defaults
    chrome.storage.local.set(options)
  })
}

function initIpfsApi (ipfsApiUrl) {
  const ipfsApi = window.frames.ipfsApiSandbox.IpfsApi
  let parsed = document.createElement('a') // oh goddess why
  parsed.href = ipfsApiUrl
  const apiHost = parsed.hostname
  const apiPort = parsed.port
  const apiProtocol = parsed.protocol.split(':')[0]
  parsed.remove()
  return ipfsApi({host: apiHost, port: apiPort, procotol: apiProtocol})
}

function initIsIpfs () {
  return window.frames.isIpfsSandbox.IsIpfs
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

function onStorageChange (changes, area) {
  for (key in changes) {
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
