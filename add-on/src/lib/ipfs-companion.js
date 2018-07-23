'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { optionDefaults, storeMissingOptions } = require('./options')
const { initState, offlinePeerCount } = require('./state')
const { createIpfsPathValidator, urlAtPublicGw } = require('./ipfs-path')
const createDnsLink = require('./dns-link')
const { createRequestModifier, redirectOptOutHint } = require('./ipfs-request')
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
  var ipfsProxyContentScript
  const idleInSecs = 5 * 60
  const browserActionPortName = 'browser-action-port'

  try {
    const options = await browser.storage.local.get(optionDefaults)
    runtime = await createRuntimeChecks(browser)
    state = initState(options)
    notify = createNotifier(getState)

    if (state.active) {
      // It's ok for this to fail, node might be unavailable or mis-configured
      try {
        ipfs = await initIpfsClient(state)
      } catch (err) {
        console.error('[ipfs-companion] Failed to init IPFS client', err)
        notify(
          'notify_startIpfsNodeErrorTitle',
          err.name === 'ValidationError' ? err.details[0].message : err.message
        )
      }
    }

    copier = createCopier(getState, notify)
    dnsLink = createDnsLink(getState)
    ipfsPathValidator = createIpfsPathValidator(getState, dnsLink)
    contextMenus = createContextMenus(getState, runtime, ipfsPathValidator, {
      onAddToIpfsRawCid: addFromURL,
      onAddToIpfsKeepFilename: (info) => addFromURL(info, {wrapWithDirectory: true}),
      onCopyCanonicalAddress: () => copier.copyCanonicalAddress(),
      onCopyAddressAtPublicGw: () => copier.copyAddressAtPublicGw()
    })
    modifyRequest = createRequestModifier(getState, dnsLink, ipfsPathValidator, runtime)
    ipfsProxy = createIpfsProxy(getIpfs, getState)
    ipfsProxyContentScript = await registerIpfsProxyContentScript()
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

  function getIpfs () {
    if (state.active && ipfs) return ipfs
    console.error('[ipfs-companion] Refused access to IPFS API client, check if extension is enabled')
    throw new Error('IPFS Companion: API client is disabled')
  }

  function registerListeners () {
    browser.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, {urls: ['<all_urls>']}, ['blocking', 'requestHeaders'])
    browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, {urls: ['<all_urls>']}, ['blocking'])
    browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, {urls: ['<all_urls>']}, ['blocking'])
    browser.webRequest.onErrorOccurred.addListener(onErrorOccurred, {urls: ['<all_urls>']})
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

  // Register Content Script responsible for loading window.ipfs (ipfsProxy)
  //
  // The key difference between tabs.executeScript and contentScripts API
  // is the latter provides guarantee to execute before anything else.
  // https://github.com/ipfs-shipyard/ipfs-companion/issues/451#issuecomment-382669093
  async function registerIpfsProxyContentScript (previousHandle) {
    previousHandle = previousHandle || ipfsProxyContentScript
    if (previousHandle) {
      previousHandle.unregister()
    }
    if (!state.active || !state.ipfsProxy || !browser.contentScripts) {
      // no-op if global toggle is off, window.ipfs is disabled in Preferences
      // or if runtime has no contentScript API
      // (Chrome loads content script via manifest)
      return
    }
    const newHandle = await browser.contentScripts.register({
      matches: ['<all_urls>'],
      js: [
        {file: '/dist/bundles/ipfsProxyContentScript.bundle.js'}
      ],
      allFrames: true,
      runAt: 'document_start'
    })
    return newHandle
  }

  // HTTP Request Hooks
  // ===================================================================

  function onBeforeSendHeaders (request) {
    return modifyRequest.onBeforeSendHeaders(request)
  }

  function onBeforeRequest (request) {
    return modifyRequest.onBeforeRequest(request)
  }

  function onHeadersReceived (request) {
    return modifyRequest.onHeadersReceived(request)
  }

  function onErrorOccurred (request) {
    return modifyRequest.onErrorOccurred(request)
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
    copyAddressAtPublicGw: () => copier.copyAddressAtPublicGw(),
    copyResolvedIpnsAddress: (message) => copier.copy(message.text, 'notify_copiedResolvedIpns')
  }

  function handleMessageFromBrowserAction (message) {
    const handler = BrowserActionMessageHandlers[message && message.event]
    if (!handler) return console.warn('Unknown browser action message event', message)
    handler(message)
  }

  async function sendStatusUpdateToBrowserAction () {
    if (!browserActionPort) return
    const info = {
      active: state.active,
      ipfsNodeType: state.ipfsNodeType,
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
    if (!state.preloadAtPublicGateway) return
    // asynchronous HTTP HEAD request preloads triggers content without downloading it
    return new Promise((resolve, reject) => {
      const http = new XMLHttpRequest()
      // Make sure preload request is excluded from global redirect
      const preloadUrl = urlAtPublicGw(`${path}#${redirectOptOutHint}`, state.pubGwURLString)
      http.open('HEAD', preloadUrl)
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

  async function addFromURL (info, options) {
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
        const data = {
          path: decodeURIComponent(new URL(response.url).pathname.split('/').pop()),
          content: buffer
        }
        result = await ipfs.files.add(data, options)
      } else {
        result = await ipfs.util.addFromURL(srcUrl, options)
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

    return uploadResultHandler({result, openRootInNewTab: true})
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

  async function uploadResultHandler ({result, openRootInNewTab = false}) {
    for (let file of result) {
      if (file && file.hash) {
        const {path, url} = getIpfsPathAndNativeAddress(file.hash)
        preloadAtPublicGateway(path)
        console.info('[ipfs-companion] successfully stored', file)
        // open the wrapping directory (or the CID if wrapping was disabled)
        if (openRootInNewTab && (result.length === 1 || file.path === '' || file.path === file.hash)) {
          await browser.tabs.create({
            'url': url
          })
        }
      }
    }
    return result
  }

  // Page-specific Actions
  // -------------------------------------------------------------------

  async function onActivatedTab (activeInfo) {
    await contextMenus.update(activeInfo.tabId)
  }

  async function onNavigationCommitted (details) {
    await contextMenus.update(details.tabId)
    await updatePageActionIndicator(details.tabId, details.url)
  }

  async function updatePageActionIndicator (tabId, url) {
    // Chrome does not permit for both pageAction and browserAction to be enabled at the same time
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/398
    if (runtime.isFirefox && ipfsPathValidator.validIpfsOrIpnsUrl(url)) {
      if (url.startsWith(state.gwURLString) || url.startsWith(state.apiURLString)) {
        await browser.pageAction.setIcon({ tabId: tabId, path: '/icons/ipfs-logo-on.svg' })
        await browser.pageAction.setTitle({ tabId: tabId, title: browser.i18n.getMessage('pageAction_titleIpfsAtCustomGateway') })
      } else {
        await browser.pageAction.setIcon({ tabId: tabId, path: '/icons/ipfs-logo-off.svg' })
        await browser.pageAction.setTitle({ tabId: tabId, title: browser.i18n.getMessage('pageAction_titleIpfsAtPublicGateway') })
      }
      await browser.pageAction.show(tabId)
    }
  }

  async function onUpdatedTab (tabId, changeInfo, tab) {
    if (!state.active) return // skip content script injection when off
    if (changeInfo.status && changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
      if (state.linkify) {
        console.info(`[ipfs-companion] Running linkfyDOM for ${tab.url}`)
        try {
          await browser.tabs.executeScript(tabId, {
            file: '/dist/bundles/linkifyContentScript.bundle.js',
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
            file: '/dist/bundles/normalizeLinksContentScript.bundle.js',
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
    // trigger pending updates
    await sendStatusUpdateToBrowserAction()
  }

  function updatePeerCountDependentStates (oldPeerCount, newPeerCount) {
    updateAutomaticModeRedirectState(oldPeerCount, newPeerCount)
    updateBrowserActionBadge()
    contextMenus.update()
  }

  async function getSwarmPeerCount () {
    if (!ipfs) return offlinePeerCount
    try {
      const peerInfos = await ipfs.swarm.peers()
      return peerInfos.length
    } catch (error) {
      console.error(`Error while ipfs.swarm.peers: ${error}`)
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
    let shouldRestartIpfsClient = false

    for (let key in changes) {
      const change = changes[key]
      if (change.oldValue === change.newValue) continue

      // debug info
      // console.info(`Storage key "${key}" in namespace "${area}" changed. Old value was "${change.oldValue}", new value is "${change.newValue}".`)
      switch (key) {
        case 'active':
          state[key] = change.newValue
          ipfsProxyContentScript = await registerIpfsProxyContentScript()
          shouldRestartIpfsClient = true
          break
        case 'ipfsNodeType':
        case 'ipfsNodeConfig':
          shouldRestartIpfsClient = true
          state[key] = change.newValue
          break
        case 'ipfsApiUrl':
          state.apiURL = new URL(change.newValue)
          state.apiURLString = state.apiURL.toString()
          shouldRestartIpfsClient = true
          break
        case 'ipfsApiPollMs':
          setApiStatusUpdateInterval(change.newValue)
          break
        case 'customGatewayUrl':
          state.gwURL = new URL(change.newValue)
          state.gwURLString = state.gwURL.toString()
          break
        case 'publicGatewayUrl':
          state.pubGwURL = new URL(change.newValue)
          state.pubGwURLString = state.pubGwURL.toString()
          break
        case 'useCustomGateway':
          state.redirect = change.newValue
          break
        case 'ipfsProxy':
          state[key] = change.newValue
          ipfsProxyContentScript = await registerIpfsProxyContentScript()
          break
        case 'linkify':
        case 'catchUnhandledProtocols':
        case 'displayNotifications':
        case 'automaticMode':
        case 'dnslink':
        case 'preloadAtPublicGateway':
          state[key] = change.newValue
          break
      }
    }

    if (shouldRestartIpfsClient) {
      try {
        await destroyIpfsClient()
      } catch (err) {
        console.error('[ipfs-companion] Failed to destroy IPFS client', err)
        notify('notify_stopIpfsNodeErrorTitle', err.message)
      } finally {
        ipfs = null
      }

      if (!state.active) return

      try {
        ipfs = await initIpfsClient(state)
      } catch (err) {
        console.error('[ipfs-companion] Failed to init IPFS client', err)
        notify(
          'notify_startIpfsNodeErrorTitle',
          err.name === 'ValidationError' ? err.details[0].message : err.message
        )
      }

      apiStatusUpdate()
    }
  }

  // Public API
  // (typically attached to a window variable to interact with this companion instance)
  const api = {
    get ipfs () {
      return ipfs
    },

    get notify () {
      return notify
    },

    get uploadResultHandler () {
      return uploadResultHandler
    },

    destroy () {
      let destroyTasks = []
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
      if (ipfsProxyContentScript) {
        ipfsProxyContentScript.unregister()
        ipfsProxyContentScript = null
      }
      destroyTasks.push(ipfsProxy.destroy())
      ipfsProxy = null
      destroyTasks.push(destroyIpfsClient())
      return Promise.all(destroyTasks)
    }
  }

  return api
}
