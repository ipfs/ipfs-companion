'use strict'
/* eslint-env browser, webextensions */

var ipfs

const optionDefaults = Object.freeze({
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001'
})

const ipfsApiStatusUpdateAlarm = 'ipfs-api-status-update'
const ipfsRedirectUpdateAlarm = 'ipfs-redirect-update'

// used in background/background.js
function init () { // eslint-disable-line no-unused-vars
  const loadOptions = browser.storage.local.get(optionDefaults)
  return loadOptions
    .then(options => {
      ipfs = initIpfsApi(options.ipfsApiUrl)
      smokeTestLibs()
      startBrowserActionBadgeUpdater()
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

function startBrowserActionBadgeUpdater () {
  const periodInMinutes = 0.05 // 3 secs
  const when = Date.now() + 500
  browser.alarms.onAlarm.addListener(handleAlarm)
  browser.alarms.create(ipfsApiStatusUpdateAlarm, { when, periodInMinutes })
}

function handleAlarm (alarm) {
  // console.log("alarm: " + alarm.name)
  if (alarm.name === ipfsApiStatusUpdateAlarm) {
    updateIpfsApiStatus()
  }
}

function getSwarmPeerCount () {
  return ipfs.swarm.peers()
    .then(peerInfos => {
      return peerInfos.length
    })
    .catch(() => {
      // console.error(`Error while ipfs.swarm.peers: ${err}`)
      return -1
    })
}

function updateIpfsApiStatus () {
  let badgeText, badgeColor, badgeIcon
  return getSwarmPeerCount()
    .then(peerCount => {
      badgeText = peerCount.toString()
      if (peerCount > 0) {
        badgeColor = '#418B8E'
        badgeIcon = '/icons/ipfs-logo-on.svg'
      } else if (peerCount === 0) {
        badgeColor = 'red'
        badgeIcon = '/icons/ipfs-logo-on.svg'
      } else {
        // API is offline
        badgeText = ''
        badgeColor = '#8C8C8C'
        badgeIcon = '/icons/ipfs-logo-off.svg'
      }
      return setBrowserActionBadge(badgeText, badgeColor, badgeIcon)
    })
}

function setBrowserActionBadge (text, color, icon) {
  return Promise.all([
    browser.browserAction.setBadgeText({text: text}),
    browser.browserAction.setBadgeBackgroundColor({color: color}),
    browser.browserAction.setIcon({path: icon})
  ])
}

function smokeTestLibs () {
  // is-ipfs
  console.info('is-ipfs library test (should be true) --> ' + window.IsIpfs.multihash('QmUqRvxzQyYWNY6cD1Hf168fXeqDTQWwZpyXjU5RUExciZ'))
  // ipfs-api: execute test request :-)
  ipfs.id()
    .then(id => {
      console.info('ipfs-api .id() test --> Node ID is: ', id)
    })
    .catch(err => {
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

// used in background/background.js
function onStorageChange (changes, area) { // eslint-disable-line no-unused-vars
  for (let key in changes) {
    let change = changes[key]
    if (change.oldValue !== change.newValue) {
      // debug info
      // console.info(`Storage key "${key}" in namespace "${area}" changed. Old value was "${change.oldValue}", new value is "${change.newValue}".`)
      if (key === 'ipfsApiUrl') {
        ipfs = initIpfsApi(change.newValue)
      } else if (key === 'useCustomGateway') {
        browser.alarms.create(ipfsRedirectUpdateAlarm, {})
      }
    }
  }
}

