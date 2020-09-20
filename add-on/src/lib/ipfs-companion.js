'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:main')
log.error = debug('ipfs-companion:main:error')

const browser = require('webextension-polyfill')
const toMultiaddr = require('uri-to-multiaddr')
const pMemoize = require('p-memoize')
const LRU = require('lru-cache')
const { optionDefaults, storeMissingOptions, migrateOptions, guiURLString, safeURL } = require('./options')
const { initState, offlinePeerCount } = require('./state')
const { createIpfsPathValidator, sameGateway } = require('./ipfs-path')
const createDnslinkResolver = require('./dnslink')
const { createRequestModifier } = require('./ipfs-request')
const { initIpfsClient, destroyIpfsClient } = require('./ipfs-client')
const { createIpfsUrlProtocolHandler } = require('./ipfs-protocol')
const createIpfsImportHandler = require('./ipfs-import')
const createNotifier = require('./notifier')
const createCopier = require('./copier')
const createInspector = require('./inspector')
const { createRuntimeChecks } = require('./runtime-checks')
const { createContextMenus, findValueForContext, contextMenuCopyAddressAtPublicGw, contextMenuCopyRawCid, contextMenuCopyCanonicalAddress, contextMenuViewOnGateway } = require('./context-menus')
const createIpfsProxy = require('./ipfs-proxy')
const { registerSubdomainProxy } = require('./http-proxy')
const { showPendingLandingPages } = require('./on-installed')

// init happens on addon load in background/background.js
module.exports = async function init () {
  // INIT
  // ===================================================================
  var ipfs // ipfs-api instance
  var state // avoid redundant API reads by utilizing local cache of various states
  var dnslinkResolver
  var ipfsPathValidator
  var modifyRequest
  var notify
  var copier
  var inspector
  var runtime
  var contextMenus
  var apiStatusUpdateInterval
  var ipfsProxy
  var ipfsProxyContentScript
  var ipfsImportHandler
  const idleInSecs = 5 * 60
  const browserActionPortName = 'browser-action-port'

  try {
    log('init')
    await migrateOptions(browser.storage.local)
    await storeMissingOptions(await browser.storage.local.get(), optionDefaults, browser.storage.local)
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

    dnslinkResolver = createDnslinkResolver(getState)
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    copier = createCopier(notify, ipfsPathValidator)
    ipfsImportHandler = createIpfsImportHandler(getState, getIpfs, ipfsPathValidator, runtime, copier)
    inspector = createInspector(notify, ipfsPathValidator, getState)
    contextMenus = createContextMenus(getState, runtime, ipfsPathValidator, {
      onAddFromContext,
      onCopyCanonicalAddress: copier.copyCanonicalAddress,
      onCopyRawCid: copier.copyRawCid,
      onCopyAddressAtPublicGw: copier.copyAddressAtPublicGw
    })
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
    ipfsProxy = createIpfsProxy(getIpfs, getState)
    ipfsProxyContentScript = await registerIpfsProxyContentScript()
    log('register all listeners')
    registerListeners()
    await registerSubdomainProxy(getState, runtime, notify)
    log('init done')
    setApiStatusUpdateInterval(options.ipfsApiPollMs)
    await showPendingLandingPages()
  } catch (error) {
    log.error('Unable to initialize addon due to error', error)
    if (notify) notify('notify_addonIssueTitle', 'notify_addonIssueMsg')
    throw error
  }

  function getState () {
    return state
  }

  function getIpfs () {
    if (state.active && ipfs) return ipfs
    log.error('refused access to IPFS API client, check if extension is enabled')
    throw new Error('IPFS Companion: API client is disabled')
  }

  function registerListeners () {
    const onBeforeSendInfoSpec = ['blocking', 'requestHeaders']
    if (browser.webRequest.OnBeforeSendHeadersOptions && 'EXTRA_HEADERS' in browser.webRequest.OnBeforeSendHeadersOptions) {
      // Chrome 72+  requires 'extraHeaders' for accessing all headers
      // Note: we need this for code ensuring ipfs-http-client can talk to API without setting CORS
      onBeforeSendInfoSpec.push('extraHeaders')
    }
    browser.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, { urls: ['<all_urls>'] }, onBeforeSendInfoSpec)
    browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ['<all_urls>'] }, ['blocking'])
    browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, { urls: ['<all_urls>'] }, ['blocking', 'responseHeaders'])
    browser.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['<all_urls>'], types: ['main_frame'] })
    browser.webRequest.onCompleted.addListener(onCompleted, { urls: ['<all_urls>'], types: ['main_frame'] })
    browser.storage.onChanged.addListener(onStorageChange)
    browser.webNavigation.onCommitted.addListener(onNavigationCommitted)
    browser.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded)
    browser.tabs.onActivated.addListener(onActivatedTab)
    if (browser.windows) {
      browser.windows.onFocusChanged.addListener(onWindowFocusChanged)
    }
    browser.runtime.onMessage.addListener(onRuntimeMessage)
    browser.runtime.onConnect.addListener(onRuntimeConnect)

    if (runtime.hasNativeProtocolHandler) {
      log('registerStringProtocol available. Adding ipfs:// handler')
      browser.protocol.registerStringProtocol('ipfs', createIpfsUrlProtocolHandler(() => ipfs))
    } else {
      log('no browser.protocol API, native protocol will not be registered')
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
    // TODO:
    // No window.ipfs for now.
    // We will restore when Migration to JS API with Async Await and Async Iterables
    // is done:
    // https://github.com/ipfs-shipyard/ipfs-companion/pull/777
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/843
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/852#issuecomment-594510819
    const forceOff = true
    if (forceOff || !state.active || !state.ipfsProxy || !browser.contentScripts) {
      // no-op if global toggle is off, window.ipfs is disabled in Preferences
      // or if runtime has no contentScript API
      // (Chrome loads content script via manifest)
      return
    }
    const newHandle = await browser.contentScripts.register({
      matches: ['<all_urls>'],
      js: [
        { file: '/dist/bundles/ipfsProxyContentScript.bundle.js' }
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

  function onCompleted (request) {
    return modifyRequest.onCompleted(request)
  }

  // RUNTIME MESSAGES (one-off messaging)
  // ===================================================================
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/sendMessage

  function onRuntimeMessage (request, sender) {
    // console.log((sender.tab ? 'Message from a content script:' + sender.tab.url : 'Message from the extension'), request)
    if (request.pubGwUrlForIpfsOrIpnsPath) {
      const path = request.pubGwUrlForIpfsOrIpnsPath
      const { validIpfsOrIpns, resolveToPublicUrl } = ipfsPathValidator
      const result = validIpfsOrIpns(path) ? resolveToPublicUrl(path) : null
      return Promise.resolve({ pubGwUrlForIpfsOrIpnsPath: result })
    }
  }

  // PORTS (connection-based messaging)
  // ===================================================================
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/connect
  // Make a connection between different contexts inside the add-on,
  // e.g. signalling between browser action popup and background page that works
  // in everywhere, even in private contexts (https://github.com/ipfs/ipfs-companion/issues/243)

  // Cache for async URL2CID resolution used by browser action
  // (resolution happens off-band so UI render is not blocked with sometimes expensive DHT traversal)
  const url2cidCache = new LRU({ max: 10, maxAge: 1000 * 30 })

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
    [contextMenuViewOnGateway]: inspector.viewOnGateway,
    [contextMenuCopyCanonicalAddress]: copier.copyCanonicalAddress,
    [contextMenuCopyRawCid]: copier.copyRawCid,
    [contextMenuCopyAddressAtPublicGw]: copier.copyAddressAtPublicGw
  }

  function handleMessageFromBrowserAction (message) {
    const handler = BrowserActionMessageHandlers[message && message.event]
    if (!handler) return console.warn('Unknown browser action message event', message)
    handler(message)
  }

  async function sendStatusUpdateToBrowserAction () {
    if (!browserActionPort) return
    const dropSlash = url => url.replace(/\/$/, '')
    const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
    const info = {
      active: state.active,
      ipfsNodeType: state.ipfsNodeType,
      peerCount: state.peerCount,
      gwURLString: dropSlash(state.gwURLString),
      pubGwURLString: dropSlash(state.pubGwURLString),
      webuiRootUrl: dropSlash(state.webuiRootUrl), // TODO: fix js-ipfs - it fails with trailing slash
      importDir: state.importDir,
      openViaWebUI: state.openViaWebUI,
      apiURLString: dropSlash(state.apiURLString),
      redirect: state.redirect,
      noIntegrationsHostnames: state.noIntegrationsHostnames,
      currentTab
    }
    try {
      const v = await ipfs.version()
      if (v) {
        info.gatewayVersion = v.commit ? v.version + '/' + v.commit : v.version
      }
    } catch (error) {
      info.gatewayVersion = null
    }
    if (state.active && info.currentTab) {
      const url = info.currentTab.url
      info.isIpfsContext = ipfsPathValidator.isIpfsPageActionsContext(url)
      if (info.isIpfsContext) {
        info.currentTabPublicUrl = ipfsPathValidator.resolveToPublicUrl(url)
        info.currentTabContentPath = ipfsPathValidator.resolveToIpfsPath(url)
        if (!url2cidCache.has(url)) {
          // run async resolution in the next event loop
          setImmediate(async () => {
            url2cidCache.set(url, await ipfsPathValidator.resolveToCid(url))
          })
        }
        info.currentTabCid = url2cidCache.get(url)
      }
      info.currentDnslinkFqdn = dnslinkResolver.findDNSLinkHostname(url)
      info.currentFqdn = info.currentDnslinkFqdn || new URL(url).hostname
      info.currentTabIntegrationsOptOut = info.noIntegrationsHostnames && info.noIntegrationsHostnames.includes(info.currentFqdn)
      info.isRedirectContext = info.currentFqdn && ipfsPathValidator.isRedirectPageActionsContext(url)
    }
    // Still here?
    if (browserActionPort) {
      browserActionPort.postMessage({ statusUpdate: info })
    }
  }

  // Context Menu Importer
  // -------------------------------------------------------------------

  async function onAddFromContext (context, contextType, options) {
    const importDir = ipfsImportHandler.formatImportDirectory(state.importDir)
    let result
    try {
      const dataSrc = await findValueForContext(context, contextType)
      if (contextType === 'selection') {
        result = await ipfsImportHandler.importFiles(Buffer.from(dataSrc), options, importDir)
      } else {
        // Enchanced addFromURL
        // --------------------
        // Initially, this was a workaround due to https://github.com/ipfs/ipfs-companion/issues/227
        // but now we have additional rules about keeping file name, so we can't use valilla ipfs.addFromURL
        const fetchOptions = {
          cache: 'force-cache',
          referrer: context.pageUrl
        }
        // console.log('onAddFromContext.context', context)
        // console.log('onAddFromContext.fetchOptions', fetchOptions)
        const response = await fetch(dataSrc, fetchOptions)
        const blob = await response.blob()
        const buffer = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(Buffer.from(reader.result))
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        })
        const url = new URL(response.url)
        // https://github.com/ipfs-shipyard/ipfs-companion/issues/599
        const filename = url.pathname === '/'
          ? url.hostname
          : url.pathname.replace(/[\\/]+$/, '').split('/').pop()
        const data = {
          path: decodeURIComponent(filename),
          content: buffer
        }
        result = await ipfsImportHandler.importFiles(data, options, importDir)
      }
    } catch (error) {
      console.error('Error in import to IPFS context menu', error)
      if (error.message === 'NetworkError when attempting to fetch resource.') {
        notify('notify_importErrorTitle', 'notify_importTrackingProtectionErrorMsg')
        console.warn('IPFS import often fails because remote file can not be downloaded due to Tracking Protection. See details at: https://github.com/ipfs/ipfs-companion/issues/227')
        browser.tabs.create({
          url: 'https://github.com/ipfs/ipfs-companion/issues/227'
        })
      } else {
        notify('notify_importErrorTitle', 'notify_inlineErrorMsg', `${error.message}`)
      }
      return
    }
    ipfsImportHandler.copyShareLink(result)
    ipfsImportHandler.preloadFilesAtPublicGateway(result)
    if (!state.localGwAvailable || !state.openViaWebUI) {
      return ipfsImportHandler.openFilesAtGateway({ result, openRootInNewTab: true })
    } else {
      return ipfsImportHandler.openFilesAtWebUI(importDir)
    }
  }

  // Page-specific Actions
  // -------------------------------------------------------------------

  async function onWindowFocusChanged (windowId) {
    // Note: On some Linux window managers, WINDOW_ID_NONE will always be sent
    // immediately preceding a switch from one browser window to another.
    if (windowId !== browser.windows.WINDOW_ID_NONE) {
      const currentTab = await browser.tabs.query({ active: true, windowId }).then(tabs => tabs[0])
      await contextMenus.update(currentTab.id)
    }
  }

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
    if (runtime.isFirefox && ipfsPathValidator.isIpfsPageActionsContext(url)) {
      if (sameGateway(url, state.gwURL) || sameGateway(url, state.apiURL)) {
        await browser.pageAction.setIcon({ tabId: tabId, path: '/icons/ipfs-logo-on.svg' })
        await browser.pageAction.setTitle({ tabId: tabId, title: browser.i18n.getMessage('pageAction_titleIpfsAtCustomGateway') })
      } else {
        await browser.pageAction.setIcon({ tabId: tabId, path: '/icons/ipfs-logo-off.svg' })
        await browser.pageAction.setTitle({ tabId: tabId, title: browser.i18n.getMessage('pageAction_titleIpfsAtPublicGateway') })
      }
      await browser.pageAction.show(tabId)
    }
  }

  async function onDOMContentLoaded (details) {
    if (!state.active) return // skip content script injection when off
    if (!details.url || !details.url.startsWith('http')) return // skip empty and special pages
    if (!state.activeIntegrations(details.url)) return // skip if opt-out exists
    // console.info(`[ipfs-companion] onDOMContentLoaded`, details)
    if (state.linkify) {
      log(`running linkfy experiment on ${details.url}`)
      try {
        await browser.tabs.executeScript(details.tabId, {
          file: '/dist/bundles/linkifyContentScript.bundle.js',
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_idle'
        })
      } catch (error) {
        log.error(`Unable to linkify DOM at '${details.url}' due to`, error)
      }
    }
    // Ensure embedded js-ipfs in Brave uses correct API
    if (details.url.startsWith(state.webuiRootUrl)) {
      const apiMultiaddr = toMultiaddr(state.apiURLString)
      await browser.tabs.executeScript(details.tabId, {
        runAt: 'document_start',
        code: `if (!localStorage.getItem('ipfsApi')) {
        console.log('[ipfs-companion] Setting API to ${apiMultiaddr}');
        localStorage.setItem('ipfsApi', '${apiMultiaddr}');
        window.location.reload();
      }`
      })
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
    const oldPeerCount = state.peerCount
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
      const peerInfos = await ipfs.swarm.peers({ timeout: 2500 })
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
      const oldColor = colorArraytoHex(await browser.browserAction.getBadgeBackgroundColor({}))
      if (badgeColor !== oldColor) {
        await browser.browserAction.setBadgeBackgroundColor({ color: badgeColor })
        await setBrowserActionIcon(badgeIcon)
      }
      const oldText = await browser.browserAction.getBadgeText({})
      if (oldText !== badgeText) await browser.browserAction.setBadgeText({ text: badgeText })
    } catch (error) {
      console.error('Unable to update browserAction badge due to error', error)
    }
  }

  async function setBrowserActionIcon (iconPath) {
    return browser.browserAction.setIcon(rasterIconDefinition(iconPath))
    /* Below fallback does not work since Chromium 80
     * (it fails in a way that does not produce error we can catch)
    const iconDefinition = { path: iconPath }
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
    */
  }

  // ColorArray [0,0,0,0] → Hex #000000
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/ColorArray
  function colorArraytoHex (colorArray) {
    if (!colorArray) return ''
    const colorAt = i => colorArray[i].toString(16).padStart(2, '0')
    const r = colorAt(0)
    const g = colorAt(1)
    const b = colorAt(2)
    return ('#' + r + g + b).toUpperCase()
  }

  const rasterIconDefinition = pMemoize((svgPath) => {
    const pngPath = (size) => {
      // point at precomputed PNG file
      const baseName = /\/icons\/(.+)\.svg/.exec(svgPath)[1]
      return `/icons/png/${baseName}_${size}.png`
    }
    // icon sizes to cover ranges from:
    // - https://bugs.chromium.org/p/chromium/issues/detail?id=647182
    // - https://developer.chrome.com/extensions/manifest/icons
    const r19 = pngPath(19)
    const r38 = pngPath(38)
    const r128 = pngPath(128)
    // return computed values to be cached by p-memoize
    return { path: { 19: r19, 38: r38, 128: r128 } }
  })

  /* Alternative: raster images generated on the fly
  const rasterIconDefinition = pMemoize((svgPath) => {
    const rasterData = (size) => {
      const icon = new Image()
      icon.src = svgPath
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      context.clearRect(0, 0, size, size)
      context.drawImage(icon, 0, 0, size, size)
      return context.getImageData(0, 0, size, size)
    }
    // icon sizes to cover ranges from:
    // - https://bugs.chromium.org/p/chromium/issues/detail?id=647182
    // - https://developer.chrome.com/extensions/manifest/icons
    const r19 = rasterData(19)
    const r38 = rasterData(38)
    const r128 = rasterData(128)
    // return computed values to be cached by p-memoize
    return { imageData: { 19: r19, 38: r38, 128: r128 } }
  })
  */

  // OPTIONS
  // ===================================================================

  function updateAutomaticModeRedirectState (oldPeerCount, newPeerCount) {
    // enable/disable gw redirect based on API going online or offline
    // newPeerCount === -1 currently implies node is offline.
    // TODO: use `node.isOnline()` if available (js-ipfs)
    if (state.automaticMode && state.localGwAvailable) {
      if (oldPeerCount === offlinePeerCount && newPeerCount > offlinePeerCount && !state.redirect) {
        browser.storage.local.set({ useCustomGateway: true })
          .then(() => notify('notify_apiOnlineTitle', 'notify_apiOnlineAutomaticModeMsg'))
      } else if (newPeerCount === offlinePeerCount && state.redirect) {
        browser.storage.local.set({ useCustomGateway: false })
          .then(() => notify('notify_apiOfflineTitle', 'notify_apiOfflineAutomaticModeMsg'))
      }
    }
  }

  async function onStorageChange (changes, area) {
    let shouldReloadExtension = false
    let shouldRestartIpfsClient = false
    let shouldStopIpfsClient = false

    for (const key in changes) {
      const change = changes[key]
      if (change.oldValue === change.newValue) continue

      // debug info
      log(`storage key "${key}" changed: "${change.oldValue}" → "${change.newValue}"`)
      switch (key) {
        case 'active':
          state[key] = change.newValue
          ipfsProxyContentScript = await registerIpfsProxyContentScript()
          await registerSubdomainProxy(getState, runtime)
          shouldRestartIpfsClient = true
          shouldStopIpfsClient = !state.active
          break
        case 'ipfsNodeType':
          // Switching between External and Embeedded HTTP Gateway in Brave is tricky.
          // For now we remove user confusion by persisting and restoring the External config.
          // TODO: refactor as a part of https://github.com/ipfs-shipyard/ipfs-companion/issues/491
          if (change.oldValue === 'external' && change.newValue === 'embedded:chromesockets') {
            const oldGatewayUrl = (await browser.storage.local.get('customGatewayUrl')).customGatewayUrl
            const oldApiUrl = (await browser.storage.local.get('ipfsApiUrl')).ipfsApiUrl
            log(`storing externalNodeConfig: ipfsApiUrl=${oldApiUrl}, customGatewayUrl=${oldGatewayUrl}"`)
            await browser.storage.local.set({ externalNodeConfig: [oldGatewayUrl, oldApiUrl] })
          } else if (change.oldValue === 'embedded:chromesockets' && change.newValue === 'external') {
            const [oldGatewayUrl, oldApiUrl] = (await browser.storage.local.get('externalNodeConfig')).externalNodeConfig
            log(`restoring externalNodeConfig: ipfsApiUrl=${oldApiUrl}, customGatewayUrl=${oldGatewayUrl}"`)
            await browser.storage.local.set({
              ipfsApiUrl: oldApiUrl,
              customGatewayUrl: oldGatewayUrl,
              externalNodeConfig: null
            })
          }
          shouldRestartIpfsClient = true
          state[key] = change.newValue
          break
        case 'ipfsNodeConfig':
          shouldRestartIpfsClient = true
          state[key] = change.newValue
          break
        case 'ipfsApiUrl':
          state.apiURL = safeURL(change.newValue, { useLocalhostName: false }) // go-ipfs returns 403 if IP is beautified to 'localhost'
          state.apiURLString = state.apiURL.toString()
          shouldRestartIpfsClient = true
          break
        case 'ipfsApiPollMs':
          setApiStatusUpdateInterval(change.newValue)
          break
        case 'customGatewayUrl':
          state.gwURL = safeURL(change.newValue, { useLocalhostName: state.useSubdomains })
          state.gwURLString = state.gwURL.toString()
          break
        case 'publicGatewayUrl':
          state.pubGwURL = new URL(change.newValue)
          state.pubGwURLString = state.pubGwURL.toString()
          break
        case 'publicSubdomainGatewayUrl':
          state.pubSubdomainGwURL = new URL(change.newValue)
          state.pubSubdomainGwURLString = state.pubSubdomainGwURL.toString()
          break
        case 'useCustomGateway':
          state.redirect = change.newValue
          break
        case 'useSubdomains':
          state[key] = change.newValue
          await browser.storage.local.set({
            // We need to update the hostname in customGatewayUrl because:
            // 127.0.0.1 - path gateway
            // localhost - subdomain gateway
            // and we need to use the latter
            customGatewayUrl: guiURLString(state.gwURLString, {
              useLocalhostName: state.useSubdomains
            })
          })
          // Finally, update proxy settings based on the state
          await registerSubdomainProxy(getState, runtime)
          break
        case 'ipfsProxy':
          state[key] = change.newValue
          // This is window.ipfs proxy, requires update of the content script:
          ipfsProxyContentScript = await registerIpfsProxyContentScript()
          break
        case 'dnslinkPolicy':
          state.dnslinkPolicy = String(change.newValue) === 'false' ? false : change.newValue
          if (state.dnslinkPolicy === 'best-effort' && !state.detectIpfsPathHeader) {
            await browser.storage.local.set({ detectIpfsPathHeader: true })
          }
          break
        case 'logNamespaces':
          shouldReloadExtension = true
          state[key] = localStorage.debug = change.newValue
          break
        case 'recoverFailedHttpRequests':
        case 'importDir':
        case 'linkify':
        case 'catchUnhandledProtocols':
        case 'displayNotifications':
        case 'displayReleaseNotes':
        case 'automaticMode':
        case 'detectIpfsPathHeader':
        case 'preloadAtPublicGateway':
        case 'openViaWebUI':
        case 'useLatestWebUI':
        case 'noIntegrationsHostnames':
        case 'dnslinkRedirect':
          state[key] = change.newValue
          break
      }
    }

    if ((state.active && shouldRestartIpfsClient) || shouldStopIpfsClient) {
      try {
        log('stoping ipfs client due to config changes', changes)
        await destroyIpfsClient()
      } catch (err) {
        console.error('[ipfs-companion] Failed to destroy IPFS client', err)
        notify('notify_stopIpfsNodeErrorTitle', err.message)
      } finally {
        ipfs = null
      }

      if (!state.active) return

      try {
        log('starting ipfs client with the new config')
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
    if (shouldReloadExtension) {
      log('reloading extension due to config change')
      browser.tabs.reload() // async reload of options page to keep it alive
      await browser.runtime.reload()
    }
    // Post update to Browser Action (if exists) -- this gives UX a snappy feel
    await sendStatusUpdateToBrowserAction()
  }

  // Public API
  // (typically attached to a window variable to interact with this companion instance)
  const api = {
    get ipfs () {
      return ipfs
    },

    get state () {
      return state
    },

    get runtime () {
      return runtime
    },

    get dnslinkResolver () {
      return dnslinkResolver
    },

    get ipfsPathValidator () {
      return ipfsPathValidator
    },

    get notify () {
      return notify
    },

    get ipfsImportHandler () {
      return ipfsImportHandler
    },

    destroy () {
      const destroyTasks = []
      clearInterval(apiStatusUpdateInterval)
      apiStatusUpdateInterval = null
      ipfs = null
      state = null
      dnslinkResolver = null
      modifyRequest = null
      ipfsPathValidator = null
      ipfsImportHandler = null
      notify = null
      copier = null
      contextMenus = null
      if (ipfsProxyContentScript) {
        ipfsProxyContentScript.unregister()
        ipfsProxyContentScript = null
      }
      if (ipfsProxy) {
        destroyTasks.push(ipfsProxy.destroy())
        ipfsProxy = null
      }
      destroyTasks.push(destroyIpfsClient())
      return Promise.all(destroyTasks)
    }
  }

  return api
}
