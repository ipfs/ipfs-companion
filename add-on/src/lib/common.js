'use strict'
/* eslint-env browser, webextensions */

// INIT
// ===================================================================
var ipfs // ipfs-api instance
var state = {} // avoid redundant API reads by utilizing local cache of various states

// init happens on addon load in background/background.js
function init () { // eslint-disable-line no-unused-vars
  const loadOptions = browser.storage.local.get(optionDefaults)
  return loadOptions
    .then(options => {
      ipfs = initIpfsApi(options.ipfsApiUrl)
      initStates(options)
      startAlarms()
      registerListeners()
      return storeMissingOptions(options, optionDefaults)
    })
    .catch(error => {
      console.error(`Unable to initialize addon due to ${error}`)
      notify('IPFS Add-on Issue', 'See Browser Console for more details')
    })
}

function initIpfsApi (ipfsApiUrl) {
  const url = new URL(ipfsApiUrl)
  return window.IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
}

function initStates (options) {
  state.redirect = options.useCustomGateway
  state.apiURLString = options.ipfsApiUrl
  state.apiURL = new URL(state.apiURLString)
  state.gwURLString = options.customGatewayUrl
  state.gwURL = new URL(state.gwURLString)
  state.automaticMode = options.automaticMode
  state.dnslink = options.dnslink
  state.dnslinkCache = /* global LRUMap */ new LRUMap(1000)
  getSwarmPeerCount()
    .then(updatePeerCountState)
    .then(updateBrowserActionBadge)
}

function updatePeerCountState (count) {
  state.peerCount = count
}

function registerListeners () {
  browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {urls: ['<all_urls>']}, ['blocking'])
  browser.storage.onChanged.addListener(onStorageChange)
  browser.tabs.onUpdated.addListener(onUpdatedTab)
}

/*
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
*/

// REDIRECT
// ===================================================================

function publicIpfsResource (url) {
  return window.IsIpfs.url(url) && !url.startsWith(state.gwURLString)
}

function redirectToCustomGateway (request) {
  const url = new URL(request.url)
  url.protocol = state.gwURL.protocol
  url.host = state.gwURL.host
  url.port = state.gwURL.port
  return { redirectUrl: url.toString() }
}

function onBeforeRequest (request) {
  if (state.redirect) {
    // IPFS resources
    if (publicIpfsResource(request.url)) {
      return redirectToCustomGateway(request)
    }
    // Look for dnslink in TXT records of visited sites
    if (isDnslookupEnabled(request)) {
      return dnslinkLookup(request)
    }
  }
}

// DNSLINK
// ===================================================================

function isDnslookupEnabled (request) {
  return state.dnslink &&
    state.peerCount > 0 &&
    request.url.startsWith('http') &&
    !request.url.startsWith(state.apiURLString) &&
    !request.url.startsWith(state.gwURLString)
}

function dnslinkLookup (request) {
  // TODO: benchmark and improve performance
  const requestUrl = new URL(request.url)
  const fqdn = requestUrl.hostname
  let dnslink = state.dnslinkCache.get(fqdn)
  if (typeof dnslink === 'undefined') {
    // fetching fresh dnslink is expensive, so we switch to async
    console.log('dnslink cache miss for: ' + fqdn)
    /* According to https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
     * "From Firefox 52 onwards, instead of returning BlockingResponse, the listener can return a Promise
     * which is resolved with a BlockingResponse. This enables the listener to process the request asynchronously."
     *
     * Seems that this does not work yet, and even tho promise is executed, request is not blocked but resolves to regular URL.
     * TODO: This should be revisited after Firefox 52 is released. If does not work by then, we need to fill a bug.
     */
    return asyncDnslookupResponse(fqdn, requestUrl)
  }
  if (dnslink) {
    console.log('SYNC resolving to Cached dnslink redirect:' + fqdn)
    return redirectToDnslinkPath(requestUrl, dnslink)
  }
}

function asyncDnslookupResponse (fqdn, requestUrl) {
  return readDnslinkTxtRecordFromApi(fqdn)
      .then(dnslink => {
        if (dnslink) {
          state.dnslinkCache.set(fqdn, dnslink)
          console.log('ASYNC Resolved dnslink for:' + fqdn + ' is: ' + dnslink)
          return redirectToDnslinkPath(requestUrl, dnslink)
        } else {
          state.dnslinkCache.set(fqdn, false)
          console.log('ASYNC NO dnslink for:' + fqdn)
          return {}
        }
      })
      .catch((error) => {
        console.error(`ASYNC Error in asyncDnslookupResponse for '${fqdn}': ${error}`)
        console.error(error)
        return {}
      })
}

function redirectToDnslinkPath (url, dnslink) {
  url.protocol = state.gwURL.protocol
  url.host = state.gwURL.host
  url.port = state.gwURL.port
  url.pathname = dnslink + url.pathname
  return { redirectUrl: url.toString() }
}

function readDnslinkTxtRecordFromApi (fqdn) {
  // js-ipfs-api does not provide method for fetching this
  // TODO: revisit after https://github.com/ipfs/js-ipfs-api/issues/501 is addressed
  return new Promise((resolve, reject) => {
    const apiCall = state.apiURLString + '/api/v0/dns/' + fqdn
    const xhr = new XMLHttpRequest() // older XHR API us used because window.fetch appends Origin which causes error 403 in go-ipfs
    xhr.open('GET', apiCall)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.onload = function () {
      if (this.status === 200) {
        const dnslink = JSON.parse(xhr.responseText).Path
        resolve(dnslink)
      } else if (this.status === 500) {
        // go-ipfs returns 500 if host has no dnslink
        // TODO: find/fill an upstream bug to make this more intuitive
        resolve(false)
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        })
      }
    }
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      })
    }
    xhr.send()
  })
}

// ALARMS
// ===================================================================

const ipfsApiStatusUpdateAlarm = 'ipfs-api-status-update'
const ipfsRedirectUpdateAlarm = 'ipfs-redirect-update'

function handleAlarm (alarm) {
  // avoid making expensive updates when IDLE
  if (alarm.name === ipfsApiStatusUpdateAlarm) {
    getSwarmPeerCount()
      .then(updatePeerCountState)
      .then(updateAutomaticModeRedirectState)
      .then(updateBrowserActionBadge)
  }
}

/*
const idleInSecs = 60
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
*/

// API HELPERS
// ===================================================================

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

// GUI
// ===================================================================

function notify (title, message) {
  browser.notifications.create({
    'type': 'basic',
    'iconUrl': browser.extension.getURL('icons/ipfs-logo-on.svg'),
    'title': title,
    'message': message
  })
}

// pageAction
// -------------------------------------------------------------------

function onUpdatedTab (tabId, changeInfo, tab) {
  if (window.IsIpfs.url(tab.url)) {
    browser.pageAction.show(tab.id)
  } else {
    browser.pageAction.hide(tab.id)
  }
}

// browserAction
// -------------------------------------------------------------------

function startAlarms () {
  const periodInMinutes = 0.05 // 3 secs
  const when = Date.now() + 500
  browser.alarms.onAlarm.addListener(handleAlarm)
  browser.alarms.create(ipfsApiStatusUpdateAlarm, { when, periodInMinutes })
}

function updateBrowserActionBadge () {
  let badgeText, badgeColor, badgeIcon
  badgeText = state.peerCount.toString()
  if (state.peerCount > 0) {
    badgeColor = '#418B8E'
    badgeIcon = '/icons/ipfs-logo-on.svg'
  } else if (state.peerCount === 0) {
    badgeColor = 'red'
    badgeIcon = '/icons/ipfs-logo-on.svg'
  } else {
    // API is offline
    badgeText = ''
    badgeColor = '#8C8C8C'
    badgeIcon = '/icons/ipfs-logo-off.svg'
  }
  return setBrowserActionBadge(badgeText, badgeColor, badgeIcon)
}

function setBrowserActionBadge (text, color, icon) {
  return Promise.all([
    browser.browserAction.setBadgeBackgroundColor({color: color}),
    browser.browserAction.setBadgeText({text: text}),
    browser.browserAction.setIcon({path: icon})
  ])
}

// OPTIONS
// ===================================================================

const optionDefaults = Object.freeze({
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  automaticMode: true,
  dnslink: false,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001'
})

function updateAutomaticModeRedirectState () {
  // enable/disable gw redirect based on API status and available peer count
  if (state.automaticMode) {
    if (state.peerCount > 0 && !state.redirect) { // enable if disabled
      browser.storage.local.set({useCustomGateway: true})
        .then(() => notify('IPFS API is Online', 'Automatic Mode: Custom Gateway Redirect is active'))
    } else if (state.peerCount < 1 && state.redirect) { // disable if enabled
      browser.storage.local.set({useCustomGateway: false})
        .then(() => notify('IPFS API is Offline', 'Automatic Mode: Public Gateway will be used as a fallback'))
    }
  }
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

function onStorageChange (changes, area) { // eslint-disable-line no-unused-vars
  for (let key in changes) {
    let change = changes[key]
    if (change.oldValue !== change.newValue) {
      // debug info
      // console.info(`Storage key "${key}" in namespace "${area}" changed. Old value was "${change.oldValue}", new value is "${change.newValue}".`)
      if (key === 'ipfsApiUrl') {
        state.apiURLString = change.newValue
        state.apiURL = new URL(state.apiURLString)
        ipfs = initIpfsApi(state.apiURLString)
        browser.alarms.create(ipfsApiStatusUpdateAlarm, {})
      } else if (key === 'customGatewayUrl') {
        state.gwURLString = change.newValue
        state.gwURL = new URL(state.gwURLString)
      } else if (key === 'useCustomGateway') {
        state.redirect = change.newValue
        browser.alarms.create(ipfsRedirectUpdateAlarm, {})
      } else if (key === 'automaticMode') {
        state.automaticMode = change.newValue
      } else if (key === 'dnslink') {
        state.dnslink = change.newValue
      }
    }
  }
}

// OTHER
// ===================================================================

// It's always worse than it seems
