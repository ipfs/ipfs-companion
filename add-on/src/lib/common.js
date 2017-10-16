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
    registerListeners()
    setApiStatusUpdateInterval(options.ipfsApiPollMs)
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

function initStates (options) {
  // we store the most used values in optimized form
  // to minimize performance impact on overall browsing experience
  state.pubGwURL = new URL(options.publicGatewayUrl)
  state.pubGwURLString = state.pubGwURL.toString()
  state.redirect = options.useCustomGateway
  state.apiURL = new URL(options.ipfsApiUrl)
  state.apiURLString = state.apiURL.toString()
  state.gwURL = new URL(options.customGatewayUrl)
  state.gwURLString = state.gwURL.toString()
  state.automaticMode = options.automaticMode
  state.linkify = options.linkify
  state.dnslink = options.dnslink
  state.catchUnhandledProtocols = options.catchUnhandledProtocols
  state.displayNotifications = options.displayNotifications
  state.dnslinkCache = /* global LRUMap */ new LRUMap(1000)
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

// REDIRECT
// ===================================================================

function publicIpfsOrIpnsResource (url) {
  // first, exclude gateway and api, otherwise we have infinite loop
  if (!url.startsWith(state.gwURLString) && !url.startsWith(state.apiURLString)) {
    // /ipfs/ is easy to validate, we just check if CID is correct and return if true
    if (window.IsIpfs.ipfsUrl(url)) {
      return true
    }
    // /ipns/ requires multiple stages/branches, as it can be FQDN with dnslink or CID
    if (window.IsIpfs.ipnsUrl(url) && validIpnsPath(new URL(url).pathname)) {
      return true
    }
  }
  // everything else is not ipfs-related
  return false
}

function validIpnsPath (path) {
  if (window.IsIpfs.ipnsPath(path)) {
    // we may have false-positives here, so we do additional checks below
    const ipnsRoot = path.match(/^\/ipns\/([^/]+)/)[1]
    // console.log('==> IPNS root', ipnsRoot)
    // first check if root is a regular CID
    if (window.IsIpfs.cid(ipnsRoot)) {
      // console.log('==> IPNS is a valid CID', ipnsRoot)
      return true
    }
    if (isDnslookupPossible() && cachedDnslinkLookup(ipnsRoot)) {
      // console.log('==> IPNS for FQDN with valid dnslink: ', ipnsRoot)
      return true
    }
  }
  return false
}

function validIpfsOrIpnsPath (path) {
  return window.IsIpfs.ipfsPath(path) || validIpnsPath(path)
}

function redirectToCustomGateway (requestUrl) {
  const url = new URL(requestUrl)
  url.protocol = state.gwURL.protocol
  url.host = state.gwURL.host
  url.port = state.gwURL.port
  return { redirectUrl: url.toString() }
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
  // skip requests to the custom gateway or API (otherwise we have too much recursion)
  if (request.url.startsWith(state.gwURLString) || request.url.startsWith(state.apiURLString)) {
    return
  }

  // poor-mans protocol handlers - https://github.com/ipfs/ipfs-companion/issues/164#issuecomment-328374052
  if (state.catchUnhandledProtocols && mayContainUnhandledIpfsProtocol(request)) {
    const fix = normalizedUnhandledIpfsProtocol(request)
    if (fix) {
      return fix
    }
  }

  // handler for protocol_handlers from manifest.json
  if (webPlusProtocolRequest(request)) {
    // fix path passed via custom protocol
    const fix = normalizedWebPlusRequest(request)
    if (fix) {
      return fix
    }
  }

  // handle redirects to custom gateway
  if (state.redirect) {
    // Detect valid /ipfs/ and /ipns/ on any site
    if (publicIpfsOrIpnsResource(request.url)) {
      return redirectToCustomGateway(request.url)
    }
    // Look for dnslink in TXT records of visited sites
    if (state.dnslink && isDnslookupSafeForURL(request.url)) {
      return dnslinkLookupAndOptionalRedirect(request.url)
    }
  }
}

// PROTOCOL HANDLERS: web+ in Firefox (protocol_handlers from manifest.json)
// ===================================================================

const webPlusProtocolHandler = 'https://ipfs.io/web%2B'

function webPlusProtocolRequest (request) {
  return request.url.startsWith(webPlusProtocolHandler)
}

function urlAtPublicGw (path) {
  return new URL(`${state.pubGwURLString}${path}`).toString().replace(/([^:]\/)\/+/g, '$1')
}

function normalizedWebPlusRequest (request) {
  const oldPath = decodeURIComponent(new URL(request.url).pathname)
  let path = oldPath
  path = path.replace(/^\/web\+dweb:\//i, '/') // web+dweb:/ipfs/Qm → /ipfs/Qm
  path = path.replace(/^\/web\+ipfs:\/\//i, '/ipfs/') // web+ipfs://Qm → /ipfs/Qm
  path = path.replace(/^\/web\+ipns:\/\//i, '/ipns/') // web+ipns://Qm → /ipns/Qm
  if (oldPath !== path && window.IsIpfs.path(path)) {
    return { redirectUrl: urlAtPublicGw(path) }
  }
  return null
}

// PROTOCOL HANDLERS: UNIVERSAL FALLBACK FOR UNHANDLED PROTOCOLS
// ===================================================================

const unhandledIpfsRE = /=(?:web%2B|)(ipfs(?=%3A%2F%2F)|ipns(?=%3A%2F%2F)|dweb(?=%3A%2Fip[f|n]s))%3A(?:%2F%2F|%2F)([^&]+)/

function mayContainUnhandledIpfsProtocol (request) {
  return request.type === 'main_frame' && request.url.includes('%3A%2F')
}

function unhandledIpfsPath (requestUrl) {
  const unhandled = requestUrl.match(unhandledIpfsRE)
  if (unhandled && unhandled.length > 1) {
    const unhandledProtocol = decodeURIComponent(unhandled[1])
    const unhandledPath = `/${decodeURIComponent(unhandled[2])}`
    return window.IsIpfs.path(unhandledPath) ? unhandledPath : `/${unhandledProtocol}${unhandledPath}`
  }
  return null
}

function normalizedUnhandledIpfsProtocol (request) {
  const path = unhandledIpfsPath(request.url)
  if (window.IsIpfs.path(path)) {
    // replace search query with fake request to the public gateway
    // (will be redirected later, if needed)
    return { redirectUrl: urlAtPublicGw(path) }
  }
}

// DNSLINK
// ===================================================================

function isDnslookupPossible () {
  // DNS lookups require IPFS API to be up
  // and have a confirmed connection to the internet
  return state.peerCount > 0
}

function isDnslookupSafeForURL (requestUrl) {
  // skip URLs that could produce infinite recursion or weird loops
  return isDnslookupPossible() &&
    requestUrl.startsWith('http') &&
    !window.IsIpfs.url(requestUrl) &&
    !requestUrl.startsWith(state.apiURLString) &&
    !requestUrl.startsWith(state.gwURLString)
}

function dnslinkLookupAndOptionalRedirect (requestUrl) {
  const url = new URL(requestUrl)
  const fqdn = url.hostname
  const dnslink = cachedDnslinkLookup(fqdn)
  if (dnslink) {
    return redirectToDnslinkPath(url, dnslink)
  }
}

function cachedDnslinkLookup (fqdn) {
  let dnslink = state.dnslinkCache.get(fqdn)
  if (typeof dnslink === 'undefined') {
    try {
      console.log('dnslink cache miss for: ' + fqdn)
      dnslink = readDnslinkFromTxtRecord(fqdn)
      if (dnslink) {
        state.dnslinkCache.set(fqdn, dnslink)
        console.log(`Resolved dnslink: '${fqdn}' -> '${dnslink}'`)
      } else {
        state.dnslinkCache.set(fqdn, false)
        console.log(`Resolved NO dnslink for '${fqdn}'`)
      }
    } catch (error) {
      console.error(`Error in dnslinkLookupAndOptionalRedirect for '${fqdn}'`)
      console.error(error)
    }
  } else {
    console.log(`Resolved via cached dnslink: '${fqdn}' -> '${dnslink}'`)
  }
  return dnslink
}

function redirectToDnslinkPath (url, dnslink) {
  url.protocol = state.gwURL.protocol
  url.host = state.gwURL.host
  url.port = state.gwURL.port
  url.pathname = dnslink + url.pathname
  return { redirectUrl: url.toString() }
}

function readDnslinkFromTxtRecord (fqdn) {
  // js-ipfs-api does not provide method for fetching this
  // TODO: revisit after https://github.com/ipfs/js-ipfs-api/issues/501 is addressed
  const apiCall = state.apiURLString + '/api/v0/dns/' + fqdn
  const xhr = new XMLHttpRequest() // older XHR API us used because window.fetch appends Origin which causes error 403 in go-ipfs
  // synchronous mode with small timeout
  // (it is okay, because we do it only once, then it is cached and read via cachedDnslinkLookup)
  xhr.open('GET', apiCall, false)
  xhr.setRequestHeader('Accept', 'application/json')
  xhr.send(null)
  if (xhr.status === 200) {
    const dnslink = JSON.parse(xhr.responseText).Path
    // console.log('readDnslinkFromTxtRecord', readDnslinkFromTxtRecord)
    if (!window.IsIpfs.path(dnslink)) {
      throw new Error(`dnslink for '${fqdn}' is not a valid IPFS path: '${dnslink}'`)
    }
    return dnslink
  } else if (xhr.status === 500) {
    // go-ipfs returns 500 if host has no dnslink
    // TODO: find/fill an upstream bug to make this more intuitive
    return false
  } else {
    throw new Error(xhr.statusText)
  }
}

// RUNTIME MESSAGES (one-off messaging)
// ===================================================================
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/sendMessage

function onRuntimeMessage (request, sender) {
  // console.log((sender.tab ? 'Message from a content script:' + sender.tab.url : 'Message from the extension'), request)
  if (request.pubGwUrlForIpfsOrIpnsPath) {
    const path = request.pubGwUrlForIpfsOrIpnsPath
    const result = validIpfsOrIpnsPath(path) ? urlAtPublicGw(path) : null
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
  console.log(`[ipfs-companion] ${title}: ${message}`)
}

// contextMenus
// -------------------------------------------------------------------
const contextMenuUploadToIpfs = 'contextMenu_UploadToIpfs'
const contextMenuCopyIpfsAddress = 'panelCopy_currentIpfsAddress'
const contextMenuCopyPublicGwUrl = 'panel_copyCurrentPublicGwUrl'

browser.contextMenus.create({
  id: contextMenuUploadToIpfs,
  title: browser.i18n.getMessage(contextMenuUploadToIpfs),
  contexts: ['image', 'video', 'audio'],
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

function inFirefox () {
  return !!navigator.userAgent.match('Firefox')
}

async function addFromURL (info) {
  try {
    if (inFirefox()) {
      // workaround due to https://github.com/ipfs/ipfs-companion/issues/227
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
    } else {
      ipfs.util.addFromURL(info.srcUrl, uploadResultHandler)
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
  const rawIpfsAddress = url.replace(/^.+(\/ip(f|n)s\/.+)/, '$1')
  copyTextToClipboard(rawIpfsAddress)
  notify('notify_copiedCanonicalAddressTitle', rawIpfsAddress)
}

async function copyAddressAtPublicGw (context) {
  const url = await findUrlForContext(context)
  const urlAtPubGw = url.replace(state.gwURLString, state.pubGwURLString)
  copyTextToClipboard(urlAtPubGw)
  notify('notify_copiedPublicURLTitle', urlAtPubGw)
}

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
  await browser.contextMenus.update(contextMenuUploadToIpfs, {enabled: state.peerCount > 0})
  if (changedTabId) {
    // recalculate tab-dependant menu items
    const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
    if (currentTab.id === changedTabId) {
      const ipfsContext = isIpfsPageActionsContext(currentTab.url)
      browser.contextMenus.update(contextMenuCopyIpfsAddress, {enabled: ipfsContext})
      browser.contextMenus.update(contextMenuCopyPublicGwUrl, {enabled: ipfsContext})
    }
  }
}

// Page-specific Actions
// -------------------------------------------------------------------

// used in browser-action popup
// eslint-disable-next-line no-unused-vars
function isIpfsPageActionsContext (url) {
  return window.IsIpfs.url(url) && !url.startsWith(state.apiURLString)
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
      console.log(`[ipfs-companion] Running linkfyDOM for ${tab.url}`)
      try {
        const browserApiPresent = (await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: "typeof browser !== 'undefined'" }))[0]
        if (!browserApiPresent) {
          await browser.tabs.executeScript(tabId, {
            file: '/src/lib/npm/browser-polyfill.min.js',
            matchAboutBlank: false,
            allFrames: true,
            runAt: 'document_start'
          })
        }
        await browser.tabs.executeScript(tabId, {
          file: '/src/lib/linkifyDOM.js',
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
          file: '/src/lib/normalizeLinksWithUnhandledProtocols.js',
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

function setApiStatusUpdateInterval (ipfsApiPollMs) {
  if (apiStatusUpdateInterval) {
    clearInterval(apiStatusUpdateInterval)
  }
  apiStatusUpdateInterval = setInterval(() => runIfNotIdle(apiStatusUpdate), ipfsApiPollMs)
  apiStatusUpdate()
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
      }
    }
  }
}

// OTHER
// ===================================================================

// It's always worse than it seems
