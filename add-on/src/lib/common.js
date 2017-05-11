'use strict'
/* eslint-env browser, webextensions */
/* global optionDefaults */

// INIT
// ===================================================================
var ipfs // ipfs-api instance
var state = {} // avoid redundant API reads by utilizing local cache of various states

// init happens on addon load in background/background.js
// eslint-disable-next-line no-unused-vars
async function init () {
  try {
    const options = await browser.storage.local.get(optionDefaults)
    ipfs = initIpfsApi(options.ipfsApiUrl)
    initStates(options)
    restartAlarms(options)
    registerListeners()
    await storeMissingOptions(options, optionDefaults)
  } catch (error) {
    console.error('Unable to initialize addon due to error', error)
    notify('notify_addonIssueTitle', 'notify_addonIssueMsg')
  }
}

function initIpfsApi (ipfsApiUrl) {
  const url = new URL(ipfsApiUrl)
  return window.IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
}

async function initStates (options) {
  state.redirect = options.useCustomGateway
  state.apiURL = new URL(options.ipfsApiUrl)
  state.apiURLString = state.apiURL.toString()
  state.gwURL = new URL(options.customGatewayUrl)
  state.gwURLString = state.gwURL.toString()
  state.automaticMode = options.automaticMode
  state.linkify = options.linkify
  state.dnslink = options.dnslink
  state.dnslinkCache = /* global LRUMap */ new LRUMap(1000)
  await getSwarmPeerCount()
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
  return window.IsIpfs.url(url) && !url.startsWith(state.gwURLString) && !url.startsWith(state.apiURLString)
}

function redirectToCustomGateway (request) {
  const url = new URL(request.url)
  url.protocol = state.gwURL.protocol
  url.host = state.gwURL.host
  url.port = state.gwURL.port
  return { redirectUrl: url.toString() }
}

function redirectToNormalizedPath (request) {
  const url = new URL(request.url)
  let path = decodeURIComponent(url.pathname)
  path = path.replace(/^\/web\+fs:[/]*/i, '/') // web+fs://ipfs/Qm → /ipfs/Qm
  path = path.replace(/^\/web\+dweb:[/]*/i, '/') // web+dweb://ipfs/Qm → /ipfs/Qm
  path = path.replace(/^\/web\+([^:]+):[/]*/i, '/$1/') // web+foo://Qm → /foo/Qm
  path = path.replace(/^\/ip([^/]+)\/ip[^/]+\//, '/ip$1/') // /ipfs/ipfs/Qm → /ipfs/Qm
  url.pathname = path
  return { redirectUrl: url.toString() }
}

function onBeforeRequest (request) {
  if (request.url.startsWith('https://ipfs.io/web%2B')) {
    // fix path passed via custom protocol
    return redirectToNormalizedPath(request)
  }
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

async function asyncDnslookupResponse (fqdn, requestUrl) {
  try {
    const dnslink = await readDnslinkTxtRecordFromApi(fqdn)
    if (dnslink) {
      state.dnslinkCache.set(fqdn, dnslink)
      console.log('ASYNC Resolved dnslink for:' + fqdn + ' is: ' + dnslink)
      return redirectToDnslinkPath(requestUrl, dnslink)
    } else {
      state.dnslinkCache.set(fqdn, false)
      console.log('ASYNC NO dnslink for:' + fqdn)
      return {}
    }
  } catch (error) {
    console.error(`ASYNC Error in asyncDnslookupResponse for '${fqdn}': ${error}`)
    console.error(error)
    return {}
  }
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
        reject(new Error(xhr.statusText))
      }
    }
    xhr.onerror = function () {
      reject(new Error(xhr.statusText))
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
      .then(updateContextMenus)
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

async function getSwarmPeerCount () {
  try {
    const peerInfos = await ipfs.swarm.peers()
    return peerInfos.length
  } catch (error) {
      // console.error(`Error while ipfs.swarm.peers: ${err}`)
    return -1
  }
}

// GUI
// ===================================================================

function notify (titleKey, messageKey, messageParam) {
  let message
  if (messageKey.startsWith('notify_')) {
    message = messageParam ? browser.i18n.getMessage(messageKey, messageParam) : browser.i18n.getMessage(messageKey)
  } else {
    message = messageKey
  }

  browser.notifications.create({
    'type': 'basic',
    'iconUrl': browser.extension.getURL('icons/ipfs-logo-on.svg'),
    'title': browser.i18n.getMessage(titleKey),
    'message': message
  })
}

// contextMenus
// -------------------------------------------------------------------
const contextMenuUploadToIpfs = 'contextMenu_UploadToIpfs'

browser.contextMenus.create({
  id: contextMenuUploadToIpfs,
  title: browser.i18n.getMessage(contextMenuUploadToIpfs),
  contexts: ['image', 'video', 'audio'],
  onclick: addFromURL
})

async function addFromURL (info) {
  // disabled due to https://github.com/lidel/ipfs-firefox-addon/issues/227
  // ipfs.util.addFromURL(info.srcUrl, uploadResultHandler)
  try {
    const fetchOptions = {
      cache: 'force-cache',
      referrer: info.pageUrl
    }
    // console.log('addFromURL.info', info)
    // console.log('addFromURL.fetchOptions', fetchOptions)
    const response = await fetch(info.srcUrl, fetchOptions)
    const reader = new FileReader()
    reader.onloadend = () => {
      const buffer = ipfs.Buffer.from(reader.result)
      ipfs.add(buffer, uploadResultHandler)
    }
    reader.readAsArrayBuffer(await response.blob())
  } catch (error) {
    console.error(`Error for ${contextMenuUploadToIpfs}`, error)
    if (error.message === 'NetworkError when attempting to fetch resource.') {
      notify('notify_uploadErrorTitle', 'notify_uploadTrackingProtectionErrorMsg')
      console.warn('IPFS upload often fails because remote file can not be downloaded due to Tracking Protection. See details at: https://github.com/lidel/ipfs-firefox-addon/issues/227')
      browser.tabs.create({
        'url': 'https://github.com/lidel/ipfs-firefox-addon/issues/227'
      })
    } else {
      notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${error.message}`)
    }
  }
}

function uploadResultHandler (err, result) {
  if (err || !result) {
    console.error('ipfs add error', err, result)
    notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${err}`)
    return
  }
  result.forEach(function (file) {
    if (file && file.hash) {
      browser.tabs.create({
        'url': new URL(state.gwURLString + '/ipfs/' + file.hash).toString()
      })
      console.log('successfully stored', file.hash)
    }
  })
}

function updateContextMenus () {
  browser.contextMenus.update(contextMenuUploadToIpfs, {enabled: state.peerCount > 0})
}

// Page Actions
// -------------------------------------------------------------------

// used in browser-action popup
// eslint-disable-next-line no-unused-vars
function isIpfsPageActionsContext (url) {
  return window.IsIpfs.url(url) && !url.startsWith(state.apiURLString)
}

async function onUpdatedTab (tabId, changeInfo, tab) {
  if (tab && tab.url) {
    if (state.linkify && changeInfo.status === 'complete') {
      console.log(`Running linkfyDOM for ${tab.url}`)
      try {
        await browser.tabs.executeScript(tabId, {
          file: '/src/lib/linkifyDOM.js',
          matchAboutBlank: false,
          allFrames: true
        })
      } catch (error) {
        console.error(`Unable to linkify DOM at '${tab.url}' due to ${error}`)
      }
    }
  }
}

// browserAction
// -------------------------------------------------------------------

async function restartAlarms (options) {
  await browser.alarms.clearAll()
  if (!browser.alarms.onAlarm.hasListener(handleAlarm)) {
    browser.alarms.onAlarm.addListener(handleAlarm)
  }
  await createIpfsApiStatusUpdateAlarm(options.ipfsApiPollMs)
}

function createIpfsApiStatusUpdateAlarm (ipfsApiPollMs) {
  const periodInMinutes = ipfsApiPollMs / 60000
  const when = Date.now() + 500
  return browser.alarms.create(ipfsApiStatusUpdateAlarm, { when, periodInMinutes })
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

function updateAutomaticModeRedirectState () {
  // enable/disable gw redirect based on API status and available peer count
  if (state.automaticMode) {
    if (state.peerCount > 0 && !state.redirect) { // enable if disabled
      browser.storage.local.set({useCustomGateway: true})
        .then(() => notify('notify_apiOnlineTitle', 'notify_apiOnlineAutomaticModeMsg'))
    } else if (state.peerCount < 1 && state.redirect) { // disable if enabled
      browser.storage.local.set({useCustomGateway: false})
        .then(() => notify('notify_apiOfflineTitle', 'notify_apiOfflineAutomaticModeMsg'))
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
        state.apiURL = new URL(change.newValue)
        state.apiURLString = state.apiURL.toString()
        ipfs = initIpfsApi(state.apiURLString)
        browser.alarms.create(ipfsApiStatusUpdateAlarm, {})
      } else if (key === 'ipfsApiPollMs') {
        browser.alarms.clear(ipfsApiStatusUpdateAlarm).then(() => {
          createIpfsApiStatusUpdateAlarm(change.newValue)
        })
      } else if (key === 'customGatewayUrl') {
        state.gwURL = new URL(change.newValue)
        state.gwURLString = state.gwURL.toString()
      } else if (key === 'useCustomGateway') {
        state.redirect = change.newValue
        browser.alarms.create(ipfsRedirectUpdateAlarm, {})
      } else if (key === 'linkify') {
        state.linkify = change.newValue
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
