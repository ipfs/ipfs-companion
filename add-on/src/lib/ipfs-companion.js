'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:main')
log.error = debug('ipfs-companion:main:error')

const browser = require('webextension-polyfill')
const toMultiaddr = require('uri-to-multiaddr')
const pMemoize = require('p-memoize')
const { optionDefaults, storeMissingOptions, migrateOptions } = require('./options')
const { initState, offlinePeerCount } = require('./state')
const { createIpfsPathValidator } = require('./ipfs-path')
const createDnslinkResolver = require('./dnslink')
const { createRequestModifier, redirectOptOutHint } = require('./ipfs-request')
const { initIpfsClient, destroyIpfsClient } = require('./ipfs-client')
const { createIpfsUrlProtocolHandler } = require('./ipfs-protocol')
const createNotifier = require('./notifier')
const createCopier = require('./copier')
const { createRuntimeChecks } = require('./runtime-checks')
const { createContextMenus, findValueForContext, contextMenuCopyAddressAtPublicGw, contextMenuCopyRawCid, contextMenuCopyCanonicalAddress } = require('./context-menus')
const createIpfsProxy = require('./ipfs-proxy')
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
  var runtime
  var contextMenus
  var apiStatusUpdateInterval
  var ipfsProxy
  var ipfsProxyContentScript
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
    await setApiStatusUpdateInterval(options.ipfsApiPollMs)
    log('init done')
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
      // Chrome 72+  requires 'extraHeaders' for access to Referer header (used in cors whitelisting of webui)
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
    if (!state.active || !state.ipfsProxy || !browser.contentScripts) {
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
      const result = ipfsPathValidator.validIpfsOrIpnsPath(path) ? ipfsPathValidator.resolveToPublicUrl(path, state.pubGwURLString) : null
      return Promise.resolve({ pubGwUrlForIpfsOrIpnsPath: result })
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
    const info = {
      active: state.active,
      ipfsNodeType: state.ipfsNodeType,
      peerCount: state.peerCount,
      gwURLString: dropSlash(state.gwURLString),
      pubGwURLString: dropSlash(state.pubGwURLString),
      webuiRootUrl: state.webuiRootUrl,
      apiURLString: dropSlash(state.apiURLString),
      redirect: state.redirect,
      noRedirectHostnames: state.noRedirectHostnames,
      currentTab: await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
    }
    try {
      const v = await ipfs.version()
      if (v) {
        info.gatewayVersion = v.commit ? v.version + '/' + v.commit : v.version
      }
    } catch (error) {
      info.gatewayVersion = null
    }
    if (info.currentTab) {
      const url = info.currentTab.url
      info.isIpfsContext = ipfsPathValidator.isIpfsPageActionsContext(url)
      info.currentDnslinkFqdn = dnslinkResolver.findDNSLinkHostname(url)
      info.currentFqdn = info.currentDnslinkFqdn || new URL(url).hostname
      info.currentTabRedirectOptOut = info.noRedirectHostnames && info.noRedirectHostnames.includes(info.currentFqdn)
      info.isRedirectContext = info.currentFqdn && ipfsPathValidator.isRedirectPageActionsContext(url)
    }
    // Still here?
    if (browserActionPort) {
      browserActionPort.postMessage({ statusUpdate: info })
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
      const preloadUrl = ipfsPathValidator.resolveToPublicUrl(`${path}#${redirectOptOutHint}`, state.pubGwURLString)
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

  // Context Menu Uploader
  // -------------------------------------------------------------------

  async function onAddFromContext (context, contextType, options) {
    let result
    try {
      const dataSrc = await findValueForContext(context, contextType)
      if (contextType === 'selection') {
        result = await ipfs.add(Buffer.from(dataSrc), options)
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
        result = await ipfs.add(data, options)
      }
    } catch (error) {
      console.error('Error in upload to IPFS context menu', error)
      if (error.message === 'NetworkError when attempting to fetch resource.') {
        notify('notify_uploadErrorTitle', 'notify_uploadTrackingProtectionErrorMsg')
        console.warn('IPFS upload often fails because remote file can not be downloaded due to Tracking Protection. See details at: https://github.com/ipfs/ipfs-companion/issues/227')
        browser.tabs.create({
          url: 'https://github.com/ipfs/ipfs-companion/issues/227'
        })
      } else {
        notify('notify_uploadErrorTitle', 'notify_inlineErrorMsg', `${error.message}`)
      }
      return
    }

    return uploadResultHandler({ result, openRootInNewTab: true })
  }

  // TODO: feature detect and push to client type specific modules.
  function getIpfsPathAndNativeAddress (hash) {
    const path = `/ipfs/${hash}`
    if (runtime.hasNativeProtocolHandler) {
      return { path, url: `ipfs://${hash}` }
    } else {
      // open at public GW (will be redirected to local elsewhere, if enabled)
      const url = new URL(path, state.pubGwURLString).toString()
      return { path, url: url }
    }
  }

  async function uploadResultHandler ({ result, openRootInNewTab = false }) {
    for (const file of result) {
      if (file && file.hash) {
        const { path, url } = getIpfsPathAndNativeAddress(file.hash)
        preloadAtPublicGateway(path)
        console.info('[ipfs-companion] successfully stored', file)
        // open the wrapping directory (or the CID if wrapping was disabled)
        if (openRootInNewTab && (result.length === 1 || file.path === '' || file.path === file.hash)) {
          await browser.tabs.create({
            url: url
          })
        }
      }
    }
    return result
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

  async function onDOMContentLoaded (details) {
    if (!state.active) return // skip content script injection when off
    if (!details.url.startsWith('http')) return // skip special pages
    // console.info(`[ipfs-companion] onDOMContentLoaded`, details)
    if (state.linkify) {
      console.info(`[ipfs-companion] Running linkfy experiment for ${details.url}`)
      try {
        await browser.tabs.executeScript(details.tabId, {
          file: '/dist/bundles/linkifyContentScript.bundle.js',
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_idle'
        })
      } catch (error) {
        console.error(`Unable to linkify DOM at '${details.url}' due to`, error)
      }
    }
    if (state.catchUnhandledProtocols) {
      // console.log(`[ipfs-companion] Normalizing links with unhandled protocols at ${tab.url}`)
      // See: https://github.com/ipfs/ipfs-companion/issues/286
      try {
        // pass the URL of user-preffered public gateway
        await browser.tabs.executeScript(details.tabId, {
          code: `window.ipfsCompanionPubGwURL = '${state.pubGwURLString}'`,
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_start'
        })
        // inject script that normalizes `href` and `src` containing unhandled protocols
        await browser.tabs.executeScript(details.tabId, {
          file: '/dist/bundles/normalizeLinksContentScript.bundle.js',
          matchAboutBlank: false,
          allFrames: true,
          runAt: 'document_end'
        })
      } catch (error) {
        console.error(`Unable to normalize links at '${details.url}' due to`, error)
      }
    }
    if (details.url.startsWith(state.webuiRootUrl)) {
      // Ensure API backend points at one from IPFS Companion
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
    if (state.automaticMode && state.ipfsNodeType !== 'embedded') {
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
          state.webuiRootUrl = `${state.gwURLString}ipfs/${state.webuiCid}/`
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
        case 'ipfsProxy':
          state[key] = change.newValue
          ipfsProxyContentScript = await registerIpfsProxyContentScript()
          break
        case 'dnslinkPolicy':
          state.dnslinkPolicy = String(change.newValue) === 'false' ? false : change.newValue
          if (state.dnslinkPolicy === 'best-effort' && !state.detectIpfsPathHeader) {
            await browser.storage.local.set({ detectIpfsPathHeader: true })
          }
          break
        case 'recoverFailedHttpRequests':
          state[key] = change.newValue
          break
        case 'logNamespaces':
          shouldReloadExtension = true
          state[key] = localStorage.debug = change.newValue
          break
        case 'linkify':
        case 'catchUnhandledProtocols':
        case 'displayNotifications':
        case 'automaticMode':
        case 'detectIpfsPathHeader':
        case 'preloadAtPublicGateway':
        case 'noRedirectHostnames':
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

    get uploadResultHandler () {
      return uploadResultHandler
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
