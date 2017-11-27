'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { optionDefaults, storeMissingOptions } = require('./options')
const { initState } = require('./state')
const IsIpfs = require('is-ipfs')
const IpfsApi = require('ipfs-api')
const { createIpfsPathValidator, safeIpfsPath, urlAtPublicGw } = require('./ipfs-path')
const createDnsLink = require('./dns-link')
const { createRequestModifier } = require('./ipfs-request')

// INIT
// ===================================================================
var ipfs // ipfs-api instance
var state // avoid redundant API reads by utilizing local cache of various states
var dnsLink
var ipfsPathValidator
var modifyRequest

// init happens on addon load in background/background.js
module.exports = async function init () {
  try {
    const options = await browser.storage.local.get(optionDefaults)
    state = window.state = initState(options)
    ipfs = window.ipfs = initIpfsApi(options.ipfsApiUrl)
    dnsLink = createDnsLink(getState)
    ipfsPathValidator = createIpfsPathValidator(getState, dnsLink)
    modifyRequest = createRequestModifier(getState, dnsLink, ipfsPathValidator)
    registerListeners()
    await setApiStatusUpdateInterval(options.ipfsApiPollMs)
    await storeMissingOptions(options, optionDefaults, browser.storage.local)
  } catch (error) {
    console.error('Unable to initialize addon due to error', error)
    notify('notify_addonIssueTitle', 'notify_addonIssueMsg')
  }
}

module.exports.destroy = function () {
  clearInterval(apiStatusUpdateInterval)
  apiStatusUpdateInterval = null
  ipfs = null
  state = null
  dnsLink = null
  modifyRequest = null
  ipfsPathValidator = null
}

function getState () {
  return state
}

function initIpfsApi (ipfsApiUrl) {
  const url = new URL(ipfsApiUrl)
  return IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
}

function registerListeners () {
  browser.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, {urls: ['<all_urls>']}, ['blocking', 'requestHeaders'])
  browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {urls: ['<all_urls>']}, ['blocking'])
  browser.storage.onChanged.addListener(onStorageChange)
  browser.webNavigation.onCommitted.addListener(onNavigationCommitted)
  browser.tabs.onUpdated.addListener(onUpdatedTab)
  browser.tabs.onActivated.addListener(onActivatedTab)
  browser.runtime.onMessage.addListener(onRuntimeMessage)
  browser.runtime.onConnect.addListener(onRuntimeConnect)
}

// HTTP Request Hooks
// ===================================================================

function onBeforeSendHeaders (request) {
  if (request.url.startsWith(state.apiURLString)) {
    // For some reason js-ipfs-api sent requests with "Origin: null" under Chrome
    // which produced '403 - Forbidden' error.
    // This workaround removes bogus header from API requests
    for (let i = 0; i < request.requestHeaders.length; i++) {
      let header = request.requestHeaders[i]
      if (header.name === 'Origin' && (header.value == null || header.value === 'null')) {
        request.requestHeaders.splice(i, 1)
        break
      }
    }
  }
  return {
    requestHeaders: request.requestHeaders
  }
}

function onBeforeRequest (request) {
  return modifyRequest(request)
}

// RUNTIME MESSAGES (one-off messaging)
// ===================================================================
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/sendMessage

function onRuntimeMessage (request, sender) {
  // console.log((sender.tab ? 'Message from a content script:' + sender.tab.url : 'Message from the extension'), request)
  if (request.pubGwUrlForIpfsOrIpnsPath) {
    const path = request.pubGwUrlForIpfsOrIpnsPath
    const result = ipfsPathValidator.validIpfsOrIpnsPath(path) ? urlAtPublicGw(path, state.pubGwURLString) : null
    return Promise.resolve({pubGwUrlForIpfsOrIpnsPath: result})
  }
}

// PORTS (connection-based messaging)
// ===================================================================
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/connect
// Make a connection between different contexts inside the add-on,
// e.g. signalling between browser action popup and background page that works
// in everywhere, even in private contexts (https://github.com/ipfs/ipfs-companion/issues/243)

const browserActionPortName = 'browser-action-port'
var browserActionPort

function onRuntimeConnect (port) {
  // console.log('onConnect', port)
  if (port.name === browserActionPortName) {
    browserActionPort = port
    browserActionPort.onMessage.addListener(handleMessageFromBrowserAction)
    browserActionPort.onDisconnect.addListener(() => { browserActionPort = null })
    sendStatusUpdateToBrowserAction()
  }
}

function handleMessageFromBrowserAction (message) {
  // console.log('In background script, received message from browser action', message)
  if (message.event === 'notification') {
    notify(message.title, message.message)
  }
}

async function sendStatusUpdateToBrowserAction () {
  if (browserActionPort) {
    const info = {
      peerCount: state.peerCount,
      gwURLString: state.gwURLString,
      pubGwURLString: state.pubGwURLString,
      currentTab: await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
    }
    try {
      let v = await ipfs.version()
      if (v) {
        info.gatewayVersion = v.commit ? v.version + '/' + v.commit : v.version
      }
    } catch (error) {
      info.gatewayVersion = null
    }
    if (info.currentTab) {
      info.ipfsPageActionsContext = isIpfsPageActionsContext(info.currentTab.url)
    }
    browserActionPort.postMessage({statusUpdate: info})
  }
}

// GUI
// ===================================================================

function notify (titleKey, messageKey, messageParam) {
  const title = browser.i18n.getMessage(titleKey)
  let message
  if (messageKey.startsWith('notify_')) {
    message = messageParam ? browser.i18n.getMessage(messageKey, messageParam) : browser.i18n.getMessage(messageKey)
  } else {
    message = messageKey
  }
  if (state.displayNotifications) {
    browser.notifications.create({
      'type': 'basic',
      'iconUrl': browser.extension.getURL('icons/ipfs-logo-on.svg'),
      'title': title,
      'message': message
    })
  }
  console.info(`[ipfs-companion] ${title}: ${message}`)
}

// contextMenus
// -------------------------------------------------------------------
const contextMenuUploadToIpfs = 'contextMenu_UploadToIpfs'
const contextMenuCopyIpfsAddress = 'panelCopy_currentIpfsAddress'
const contextMenuCopyPublicGwUrl = 'panel_copyCurrentPublicGwUrl'

try {
  browser.contextMenus.create({
    id: contextMenuUploadToIpfs,
    title: browser.i18n.getMessage(contextMenuUploadToIpfs),
    contexts: ['image', 'video', 'audio'],
    documentUrlPatterns: ['<all_urls>'],
    enabled: false,
    onclick: addFromURL
  })
  browser.contextMenus.create({
    id: contextMenuCopyIpfsAddress,
    title: browser.i18n.getMessage(contextMenuCopyIpfsAddress),
    contexts: ['page', 'image', 'video', 'audio', 'link'],
    documentUrlPatterns: ['*://*/ipfs/*', '*://*/ipns/*'],
    onclick: copyCanonicalAddress
  })
  browser.contextMenus.create({
    id: contextMenuCopyPublicGwUrl,
    title: browser.i18n.getMessage(contextMenuCopyPublicGwUrl),
    contexts: ['page', 'image', 'video', 'audio', 'link'],
    documentUrlPatterns: ['*://*/ipfs/*', '*://*/ipns/*'],
    onclick: copyAddressAtPublicGw
  })
} catch (err) {
  console.log('[ipfs-companion] Error creating contextMenus', err)
}

function inFirefox () {
  return !!navigator.userAgent.match('Firefox')
}

function preloadAtPublicGateway (path) {
  // asynchronous HTTP HEAD request preloads triggers content without downloading it
  return new Promise((resolve, reject) => {
    const http = new XMLHttpRequest()
    http.open('HEAD', urlAtPublicGw(path, state.pubGwURLString))
    http.onreadystatechange = function () {
      if (this.readyState === this.DONE) {
        console.info(`[ipfs-companion] preloadAtPublicGateway(${path}):`, this.statusText)
        if (this.status === 200) {
          resolve(this.statusText)
        } else {
          reject(new Error(this.statusText))
        }
      }
    }
    http.send()
  })
}

// URL Uploader
// -------------------------------------------------------------------

async function addFromURL (info) {
  const srcUrl = await findUrlForContext(info)
  try {
    if (inFirefox()) {
      // workaround due to https://github.com/ipfs/ipfs-companion/issues/227
      const fetchOptions = {
        cache: 'force-cache',
        referrer: info.pageUrl
      }
      // console.log('addFromURL.info', info)
      // console.log('addFromURL.fetchOptions', fetchOptions)
      const response = await fetch(srcUrl, fetchOptions)
      const reader = new FileReader()
      reader.onloadend = () => {
        const buffer = ipfs.Buffer.from(reader.result)
        ipfs.add(buffer, uploadResultHandler)
      }
      reader.readAsArrayBuffer(await response.blob())
    } else {
      ipfs.util.addFromURL(srcUrl, uploadResultHandler)
    }
  } catch (error) {
    console.error(`Error for ${contextMenuUploadToIpfs}`, error)
    if (error.message === 'NetworkError when attempting to fetch resource.') {
      notify('notify_uploadErrorTitle', 'notify_uploadTrackingProtectionErrorMsg')
      console.warn('IPFS upload often fails because remote file can not be downloaded due to Tracking Protection. See details at: https://github.com/ipfs/ipfs-companion/issues/227')
      browser.tabs.create({
        'url': 'https://github.com/ipfs/ipfs-companion/issues/227'
      })
    } else {
      notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${error.message}`)
    }
  }
}

function uploadResultHandler (err, result) {
  if (err || !result) {
    console.error('[ipfs-companion] ipfs add error', err, result)
    notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${err}`)
    return
  }
  result.forEach(function (file) {
    if (file && file.hash) {
      const path = `/ipfs/${file.hash}`
      browser.tabs.create({
        'url': new URL(state.gwURLString + path).toString()
      })
      console.info('[ipfs-companion] successfully stored', path)
      if (state.preloadAtPublicGateway) {
        preloadAtPublicGateway(path)
      }
    }
  })
}

window.uploadResultHandler = uploadResultHandler

// Copying URLs
// -------------------------------------------------------------------

window.safeIpfsPath = safeIpfsPath

async function findUrlForContext (context) {
  if (context) {
    if (context.linkUrl) {
      // present when clicked on a link
      return context.linkUrl
    }
    if (context.srcUrl) {
      // present when clicked on page element such as image or video
      return context.srcUrl
    }
    if (context.pageUrl) {
      // pageUrl is the root frame
      return context.pageUrl
    }
  }
  // falback to the url of current tab
  const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
  return currentTab.url
}

async function copyCanonicalAddress (context) {
  const url = await findUrlForContext(context)
  const rawIpfsAddress = safeIpfsPath(url)
  copyTextToClipboard(rawIpfsAddress)
  notify('notify_copiedCanonicalAddressTitle', rawIpfsAddress)
}

window.copyCanonicalAddress = copyCanonicalAddress

async function copyAddressAtPublicGw (context) {
  const url = await findUrlForContext(context)
  const urlAtPubGw = url.replace(state.gwURLString, state.pubGwURLString)
  copyTextToClipboard(urlAtPubGw)
  notify('notify_copiedPublicURLTitle', urlAtPubGw)
}

window.copyAddressAtPublicGw = copyAddressAtPublicGw

async function copyTextToClipboard (copyText) {
  const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
  const tabId = currentTab.id
  // Lets take a moment and ponder on the state of copying a string in 2017:
  const copyToClipboardIn2017 = `function copyToClipboardIn2017(text) {
      function oncopy(event) {
          document.removeEventListener('copy', oncopy, true);
          event.stopImmediatePropagation();
          event.preventDefault();
          event.clipboardData.setData('text/plain', text);
      }
      document.addEventListener('copy', oncopy, true);
      document.execCommand('copy');
    }`

  // In Firefox you can't select text or focus an input field in background pages,
  // so you can't write to the clipboard from a background page.
  // We work around this limitation by injecting content scropt into a tab and copying there.
  // Yes, this is 2017.
  try {
    const copyHelperPresent = (await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: "typeof copyToClipboardIn2017 === 'function';" }))[0]
    if (!copyHelperPresent) {
      await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: copyToClipboardIn2017 })
    }
    await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: 'copyToClipboardIn2017(' + JSON.stringify(copyText) + ');' })
  } catch (error) {
    console.error('Failed to copy text: ' + error)
  }
}

async function updateContextMenus (changedTabId) {
  try {
    await browser.contextMenus.update(contextMenuUploadToIpfs, {enabled: state.peerCount > 0})
    if (changedTabId) {
      // recalculate tab-dependant menu items
      const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
      if (currentTab && currentTab.id === changedTabId) {
        const ipfsContext = isIpfsPageActionsContext(currentTab.url)
        browser.contextMenus.update(contextMenuCopyIpfsAddress, {enabled: ipfsContext})
        browser.contextMenus.update(contextMenuCopyPublicGwUrl, {enabled: ipfsContext})
      }
    }
  } catch (err) {
    console.log('[ipfs-companion] Error updating context menus', err)
  }
}

// Page-specific Actions
// -------------------------------------------------------------------

// used in browser-action popup
// eslint-disable-next-line no-unused-vars
function isIpfsPageActionsContext (url) {
  return IsIpfs.url(url) && !url.startsWith(state.apiURLString)
}

async function onActivatedTab (activeInfo) {
  await updateContextMenus(activeInfo.tabId)
}

async function onNavigationCommitted (details) {
  await updateContextMenus(details.tabId)
}

async function onUpdatedTab (tabId, changeInfo, tab) {
  if (changeInfo.status && changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    if (state.linkify) {
      console.info(`[ipfs-companion] Running linkfyDOM for ${tab.url}`)
      try {
        const browserApiPresent = (await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: "typeof browser !== 'undefined'" }))[0]
        if (!browserApiPresent) {
          await browser.tabs.executeScript(tabId, {
            file: '/dist/contentScripts/browser-polyfill.min.js',
            matchAboutBlank: false,
            allFrames: true,
            runAt: 'document_start'
          })
        }
        await browser.tabs.executeScript(tabId, {
          file: '/dist/contentScripts/linkifyDOM.js',
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_idle'
        })
      } catch (error) {
        console.error(`Unable to linkify DOM at '${tab.url}' due to`, error)
      }
    }
    if (state.catchUnhandledProtocols) {
      // console.log(`[ipfs-companion] Normalizing links with unhandled protocols at ${tab.url}`)
      // See: https://github.com/ipfs/ipfs-companion/issues/286
      try {
        // pass the URL of user-preffered public gateway
        await browser.tabs.executeScript(tabId, {
          code: `window.ipfsCompanionPubGwURL = '${state.pubGwURLString}'`,
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_start'
        })
        // inject script that normalizes `href` and `src` containing unhandled protocols
        await browser.tabs.executeScript(tabId, {
          file: '/dist/contentScripts/normalizeLinksWithUnhandledProtocols.js',
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_end'
        })
      } catch (error) {
        console.error(`Unable to normalize links at '${tab.url}' due to`, error)
      }
    }
  }
}

// API STATUS UPDATES
// -------------------------------------------------------------------
// API is polled for peer count every ipfsApiPollMs

const offlinePeerCount = -1
const idleInSecs = 5 * 60

var apiStatusUpdateInterval

async function setApiStatusUpdateInterval (ipfsApiPollMs) {
  if (apiStatusUpdateInterval) {
    clearInterval(apiStatusUpdateInterval)
  }
  apiStatusUpdateInterval = setInterval(() => runIfNotIdle(apiStatusUpdate), ipfsApiPollMs)
  await apiStatusUpdate()
}

async function apiStatusUpdate () {
  let oldPeerCount = state.peerCount
  state.peerCount = await getSwarmPeerCount()
  updatePeerCountDependentStates(oldPeerCount, state.peerCount)
  sendStatusUpdateToBrowserAction()
}

function updatePeerCountDependentStates (oldPeerCount, newPeerCount) {
  updateAutomaticModeRedirectState(oldPeerCount, newPeerCount)
  updateBrowserActionBadge()
  updateContextMenus()
}

async function getSwarmPeerCount () {
  try {
    const peerInfos = await ipfs.swarm.peers()
    return peerInfos.length
  } catch (error) {
    // console.error(`Error while ipfs.swarm.peers: ${err}`)
    return offlinePeerCount
  }
}

async function runIfNotIdle (action) {
  try {
    const state = await browser.idle.queryState(idleInSecs)
    if (state === 'active') {
      return action()
    }
  } catch (error) {
    console.error('Unable to read idle state, executing action without idle check', error)
    return action()
  }
}

// browserAction
// -------------------------------------------------------------------

async function updateBrowserActionBadge () {
  let badgeText, badgeColor, badgeIcon
  badgeText = state.peerCount.toString()
  if (state.peerCount > 0) {
    // All is good (online with peers)
    badgeColor = '#418B8E'
    badgeIcon = '/icons/ipfs-logo-on.svg'
  } else if (state.peerCount === 0) {
    // API is online but no peers
    badgeColor = 'red'
    badgeIcon = '/icons/ipfs-logo-on.svg'
  } else {
    // API is offline
    badgeText = ''
    badgeColor = '#8C8C8C'
    badgeIcon = '/icons/ipfs-logo-off.svg'
  }
  try {
    await browser.browserAction.setBadgeBackgroundColor({color: badgeColor})
    await browser.browserAction.setBadgeText({text: badgeText})
    await setBrowserActionIcon(badgeIcon)
  } catch (error) {
    console.error('Unable to update browserAction badge due to error', error)
  }
}

async function setBrowserActionIcon (iconPath) {
  let iconDefinition = {path: iconPath}
  try {
    // Try SVG first -- Firefox supports it natively
    await browser.browserAction.setIcon(iconDefinition)
  } catch (error) {
    // Fallback!
    // Chromium does not support SVG [ticket below is 8 years old, I can't even..]
    // https://bugs.chromium.org/p/chromium/issues/detail?id=29683
    // Still, we want icon, so we precompute rasters of popular sizes and use them instead
    await browser.browserAction.setIcon(rasterIconDefinition(iconPath))
  }
}

function rasterIconDefinition (svgPath) {
  // icon sizes to cover ranges from:
  // - https://bugs.chromium.org/p/chromium/issues/detail?id=647182
  // - https://developer.chrome.com/extensions/manifest/icons
  return {
    'path': {
      '19': rasterIconPath(svgPath, 19),
      '38': rasterIconPath(svgPath, 38),
      '128': rasterIconPath(svgPath, 128)
    }
  }
}

function rasterIconPath (iconPath, size) {
  // point at precomputed PNG file
  let baseName = /\/icons\/(.+)\.svg/.exec(iconPath)[1]
  return `/icons/png/${baseName}_${size}.png`
}

/* Easter-Egg: PoC that generates raster on the fly ;-)
function rasterIconData (iconPath, size) {
  let icon = new Image()
  icon.src = iconPath
  let canvas = document.createElement('canvas')
  let context = canvas.getContext('2d')
  context.clearRect(0, 0, size, size)
  context.drawImage(icon, 0, 0, size, size)
  return context.getImageData(0, 0, size, size)
}
*/

// OPTIONS
// ===================================================================

function updateAutomaticModeRedirectState (oldPeerCount, newPeerCount) {
  // enable/disable gw redirect based on API going online or offline
  if (state.automaticMode) {
    if (oldPeerCount < 1 && newPeerCount > 0 && !state.redirect) {
      browser.storage.local.set({useCustomGateway: true})
        .then(() => notify('notify_apiOnlineTitle', 'notify_apiOnlineAutomaticModeMsg'))
    } else if (oldPeerCount > 0 && newPeerCount < 1 && state.redirect) {
      browser.storage.local.set({useCustomGateway: false})
        .then(() => notify('notify_apiOfflineTitle', 'notify_apiOfflineAutomaticModeMsg'))
    }
  }
}

function onStorageChange (changes, area) {
  for (let key in changes) {
    let change = changes[key]
    if (change.oldValue !== change.newValue) {
      // debug info
      // console.info(`Storage key "${key}" in namespace "${area}" changed. Old value was "${change.oldValue}", new value is "${change.newValue}".`)
      if (key === 'ipfsApiUrl') {
        state.apiURL = new URL(change.newValue)
        state.apiURLString = state.apiURL.toString()
        ipfs = window.ipfs = initIpfsApi(state.apiURLString)
        apiStatusUpdate()
      } else if (key === 'ipfsApiPollMs') {
        setApiStatusUpdateInterval(change.newValue)
      } else if (key === 'customGatewayUrl') {
        state.gwURL = new URL(change.newValue)
        state.gwURLString = state.gwURL.toString()
      } else if (key === 'publicGatewayUrl') {
        state.pubGwURL = new URL(change.newValue)
        state.pubGwURLString = state.pubGwURL.toString()
      } else if (key === 'useCustomGateway') {
        state.redirect = change.newValue
      } else if (key === 'linkify') {
        state.linkify = change.newValue
      } else if (key === 'catchUnhandledProtocols') {
        state.catchUnhandledProtocols = change.newValue
      } else if (key === 'displayNotifications') {
        state.displayNotifications = change.newValue
      } else if (key === 'automaticMode') {
        state.automaticMode = change.newValue
      } else if (key === 'dnslink') {
        state.dnslink = change.newValue
      } else if (key === 'preloadAtPublicGateway') {
        state.preloadAtPublicGateway = change.newValue
      }
    }
  }
}

// OTHER
// ===================================================================

// It's always worse than it seems
