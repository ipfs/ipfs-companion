'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { optionDefaults, storeMissingOptions } = require('./options')
const { initState, offlinePeerCount } = require('./state')
const { createIpfsPathValidator, urlAtPublicGw } = require('./ipfs-path')
const createDnsLink = require('./dns-link')
const { createRequestModifier } = require('./ipfs-request')
const { initIpfsClient, destroyIpfsClient } = require('./ipfs-client')
const { createIpfsUrlProtocolHandler } = require('./ipfs-protocol')
const createNotifier = require('./notifier')
const createCopier = require('./copier')
const createRuntimeChecks = require('./runtime-checks')
const { createContextMenus, findUrlForContext } = require('./context-menus')
const createIpfsProxy = require('./ipfs-proxy')

// init happens on addon load in background/background.js
module.exports = async function init () {
  // INIT
  // ===================================================================
  var ipfs // ipfs-api instance
  var state // avoid redundant API reads by utilizing local cache of various states
  var dnsLink
  var ipfsPathValidator
  var modifyRequest
  var notify
  var copier
  var runtime
  var contextMenus
  var apiStatusUpdateInterval
  var ipfsProxy
  const idleInSecs = 5 * 60
  const browserActionPortName = 'browser-action-port'

  try {
    const options = await browser.storage.local.get(optionDefaults)
    runtime = await createRuntimeChecks(browser)
    state = initState(options)
    ipfs = await initIpfsClient(state)
    notify = createNotifier(getState)
    copier = createCopier(getState, notify)
    dnsLink = createDnsLink(getState)
    ipfsPathValidator = createIpfsPathValidator(getState, dnsLink)
    contextMenus = createContextMenus(getState, ipfsPathValidator, {
      onUploadToIpfs: addFromURL,
      onCopyCanonicalAddress: () => copier.copyCanonicalAddress(),
      onCopyAddressAtPublicGw: () => copier.copyAddressAtPublicGw()
    })
    modifyRequest = createRequestModifier(getState, dnsLink, ipfsPathValidator)
    ipfsProxy = createIpfsProxy(() => ipfs, getState)
    registerListeners()
    await setApiStatusUpdateInterval(options.ipfsApiPollMs)
    await storeMissingOptions(
      await browser.storage.local.get(),
      optionDefaults,
      browser.storage.local
    )
  } catch (error) {
    console.error('Unable to initialize addon due to error', error)
    if (notify) notify('notify_addonIssueTitle', 'notify_addonIssueMsg')
    throw error
  }

  function getState () {
    return state
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

    if (runtime.hasNativeProtocolHandler) {
      console.log('[ipfs-companion] registerStringProtocol available. Adding ipfs:// handler')
      browser.protocol.registerStringProtocol('ipfs', createIpfsUrlProtocolHandler(() => ipfs))
    } else {
      console.log('[ipfs-companion] browser.protocol.registerStringProtocol not available, native protocol will not be registered')
    }
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

  const BrowserActionMessageHandlers = {
    notification: (message) => notify(message.title, message.message),
    copyCanonicalAddress: () => copier.copyCanonicalAddress(),
    copyAddressAtPublicGw: () => copier.copyAddressAtPublicGw()
  }

  function handleMessageFromBrowserAction (message) {
    const handler = BrowserActionMessageHandlers[message && message.event]
    if (!handler) return console.warn('Unknown browser action message event', message)
    handler(message)
  }

  async function sendStatusUpdateToBrowserAction () {
    if (!browserActionPort) return
    const info = {
      ipfsNodeType: state.ipfsNodeType,
      peerCount: state.peerCount,
      // Convert big.js numbers into strings before sending.
      // Chrome uses JSON.stringify to send objects over port.postMessage whereas
      // Firefox uses structured clone. It means that on the other side FF gets
      // a weird object (not a big.js number object) unless we stringify first.
      repoStats: JSON.parse(JSON.stringify(state.repoStats)),
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
      info.ipfsPageActionsContext = ipfsPathValidator.isIpfsPageActionsContext(info.currentTab.url)
    }
    // Still here?
    if (browserActionPort) {
      browserActionPort.postMessage({statusUpdate: info})
    }
  }

  // GUI
  // ===================================================================

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
    let result
    try {
      if (runtime.isFirefox) {
        // workaround due to https://github.com/ipfs/ipfs-companion/issues/227
        const fetchOptions = {
          cache: 'force-cache',
          referrer: info.pageUrl
        }
        // console.log('addFromURL.info', info)
        // console.log('addFromURL.fetchOptions', fetchOptions)
        const response = await fetch(srcUrl, fetchOptions)
        const blob = await response.blob()

        const buffer = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(Buffer.from(reader.result))
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        })

        result = await ipfs.files.add(buffer)
      } else {
        result = await ipfs.util.addFromURL(srcUrl)
      }
    } catch (error) {
      console.error('Error in upload to IPFS context menu', error)
      if (error.message === 'NetworkError when attempting to fetch resource.') {
        notify('notify_uploadErrorTitle', 'notify_uploadTrackingProtectionErrorMsg')
        console.warn('IPFS upload often fails because remote file can not be downloaded due to Tracking Protection. See details at: https://github.com/ipfs/ipfs-companion/issues/227')
        browser.tabs.create({
          'url': 'https://github.com/ipfs/ipfs-companion/issues/227'
        })
      } else {
        notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${error.message}`)
      }
      return
    }

    return uploadResultHandler(result)
  }

  // TODO: feature detect and push to client type specific modules.
  function getIpfsPathAndNativeAddress (hash) {
    const path = `/ipfs/${hash}`
    if (runtime.hasNativeProtocolHandler) {
      return {path, url: `ipfs://${hash}`}
    } else {
      // open at public GW (will be redirected to local elsewhere, if enabled)
      const url = new URL(path, state.pubGwURLString).toString()
      return {path, url: url}
    }
  }

  function uploadResultHandler (result) {
    result.forEach(function (file) {
      if (file && file.hash) {
        const {path, url} = getIpfsPathAndNativeAddress(file.hash)
        browser.tabs.create({
          'url': url
        })
        console.info('[ipfs-companion] successfully stored', path)
        if (state.preloadAtPublicGateway) {
          preloadAtPublicGateway(path)
        }
      }
    })
  }

  // Page-specific Actions
  // -------------------------------------------------------------------

  async function onActivatedTab (activeInfo) {
    await contextMenus.update(activeInfo.tabId)
  }

  async function onNavigationCommitted (details) {
    await contextMenus.update(details.tabId)
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

  async function setApiStatusUpdateInterval (ipfsApiPollMs) {
    if (apiStatusUpdateInterval) {
      clearInterval(apiStatusUpdateInterval)
    }
    apiStatusUpdateInterval = setInterval(() => runIfNotIdle(apiStatusUpdate), ipfsApiPollMs)
    await apiStatusUpdate()
  }

  async function apiStatusUpdate () {
    // update peer count
    let oldPeerCount = state.peerCount
    state.peerCount = await getSwarmPeerCount()
    updatePeerCountDependentStates(oldPeerCount, state.peerCount)
    // update repo stats
    state.repoStats = await getRepoStats()
    // trigger pending updates
    await sendStatusUpdateToBrowserAction()
  }

  function updatePeerCountDependentStates (oldPeerCount, newPeerCount) {
    updateAutomaticModeRedirectState(oldPeerCount, newPeerCount)
    updateBrowserActionBadge()
    contextMenus.update()
  }

  async function getSwarmPeerCount () {
    try {
      const peerInfos = await ipfs.swarm.peers()
      return peerInfos.length
    } catch (error) {
      console.error(`Error while ipfs.swarm.peers: ${error}`)
      return offlinePeerCount
    }
  }

  async function getRepoStats () {
    if (!ipfs.stats || !ipfs.stats.repo) return {}
    try {
      const repoStats = await ipfs.stats.repo()
      return repoStats
    } catch (error) {
      console.error(`Error while ipfs.stats.repo: ${error}`)
      return {}
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
    if (typeof browser.browserAction.setBadgeBackgroundColor === 'undefined') {
      // Firefox for Android does not have this UI, so we just skip it
      return
    }

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
    // newPeerCount === -1 currently implies node is offline.
    // TODO: use `node.isOnline()` if available (js-ipfs)
    if (state.automaticMode && state.ipfsNodeType !== 'embedded') {
      if (oldPeerCount === offlinePeerCount && newPeerCount > offlinePeerCount && !state.redirect) {
        browser.storage.local.set({useCustomGateway: true})
          .then(() => notify('notify_apiOnlineTitle', 'notify_apiOnlineAutomaticModeMsg'))
      } else if (newPeerCount === offlinePeerCount && state.redirect) {
        browser.storage.local.set({useCustomGateway: false})
          .then(() => notify('notify_apiOfflineTitle', 'notify_apiOfflineAutomaticModeMsg'))
      }
    }
  }

  async function onStorageChange (changes, area) {
    for (let key in changes) {
      let change = changes[key]
      if (change.oldValue !== change.newValue) {
        // debug info
        // console.info(`Storage key "${key}" in namespace "${area}" changed. Old value was "${change.oldValue}", new value is "${change.newValue}".`)
        if (key === 'ipfsNodeType') {
          state.ipfsNodeType = change.newValue
          ipfs = await initIpfsClient(state)
          apiStatusUpdate()
        } else if (key === 'ipfsApiUrl') {
          state.apiURL = new URL(change.newValue)
          state.apiURLString = state.apiURL.toString()
          ipfs = await initIpfsClient(state)
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
        } else if (key === 'ipfsProxy') {
          state.ipfsProxy = change.newValue
        }
      }
    }
  }

  // Public API
  // (typically attached to a window variable to interact with this companion instance)
  const api = {
    get ipfs () {
      return ipfs
    },

    async ipfsAddAndShow (buffer) {
      let result
      try {
        result = await api.ipfs.files.add(buffer)
      } catch (err) {
        console.error('Failed to IPFS add', err)
        notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${err.message}`)
        throw err
      }
      uploadResultHandler(result)
      return result
    },

    async destroy () {
      clearInterval(apiStatusUpdateInterval)
      apiStatusUpdateInterval = null
      ipfs = null
      state = null
      dnsLink = null
      modifyRequest = null
      ipfsPathValidator = null
      notify = null
      copier = null
      contextMenus = null
      ipfsProxy.destroy()
      ipfsProxy = null
      await destroyIpfsClient()
    }
  }

  return api
}

// OTHER
// ===================================================================

// It's always worse than it seems
