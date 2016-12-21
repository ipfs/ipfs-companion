'use strict'
/* eslint-env browser, webextensions */

var ipfs
var gwURLString
var gwURL
var ipfsRedirect

const optionDefaults = Object.freeze({
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001'
})

const idleInSecs = 60
const ipfsApiStatusUpdateAlarm = 'ipfs-api-status-update'
const ipfsRedirectUpdateAlarm = 'ipfs-redirect-update'

// used in background/background.js
function init () { // eslint-disable-line no-unused-vars
  const loadOptions = browser.storage.local.get(optionDefaults)
  return loadOptions
    .then(options => {
      ipfs = initIpfsApi(options.ipfsApiUrl)
      smokeTestLibs()
      ipfsRedirect = options.useCustomGateway
      gwURLString = options.customGatewayUrl
      gwURL = new URL(gwURLString)
      registerRequestRedirects()
      startBrowserActionBadgeUpdater()
      return storeMissingOptions(options, optionDefaults)
    })
    .catch(error => {
      console.error(`Unable to initialize addon due to ${error}`)
    })
}

function registerRequestRedirects () {
  browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {urls: ['<all_urls>']}, ['blocking'])
}

function publicIpfsResource (url) {
  return window.IsIpfs.url(url) && !url.startsWith(gwURLString)
}

function onBeforeRequest (request) {
  if (ipfsRedirect && publicIpfsResource(request.url)) {
    const newUrl = new URL(request.url)
    newUrl.protocol = gwURL.protocol
    newUrl.host = gwURL.host
    newUrl.port = gwURL.port
    console.log('redirecting: ' + request.url + ' to ' + newUrl.toString())
    return { redirectUrl: newUrl.toString() }
  }
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

function runIfNotIdle (action) {
  browser.idle.queryState(idleInSecs)
    .then(state => {
      if (state === 'active') {
        return action()
      }
    })
    .catch(error => {
      console.error(`Unable to read idle state due to ${error}`)
    })
}

function handleAlarm (alarm) {
  // avoid making expensive updates when IDLE
  if (alarm.name === ipfsApiStatusUpdateAlarm) {
    runIfNotIdle(refreshBrowserActionBadge)
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

function refreshBrowserActionBadge () {
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
    .catch(error => {
      console.error(`Unable to refresh BrowserAction Badge due to ${error}`)
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
        browser.alarms.create(ipfsApiStatusUpdateAlarm, {})
      } else if (key === 'customGatewayUrl') {
        gwURLString = change.newValue
        gwURL = new URL(gwURLString)
      } else if (key === 'useCustomGateway') {
        ipfsRedirect = change.newValue
        browser.alarms.create(ipfsRedirectUpdateAlarm, {})
      }
    }
  }
}

