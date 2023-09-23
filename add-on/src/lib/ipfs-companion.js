'use strict'
/* eslint-env browser, webextensions */

import debug from 'debug'

import all from 'it-all'
import LRU from 'lru-cache'
import pMemoize from 'p-memoize'
import toMultiaddr from 'uri-to-multiaddr'
import browser from 'webextension-polyfill'
import { handleConsentFromState, trackView } from '../lib/telemetry.js'
import { contextMenuCopyAddressAtPublicGw, contextMenuCopyCanonicalAddress, contextMenuCopyCidAddress, contextMenuCopyPermalink, contextMenuCopyRawCid, contextMenuViewOnGateway, createContextMenus, findValueForContext } from './context-menus.js'
import createCopier from './copier.js'
import createDnslinkResolver from './dnslink.js'
import { registerSubdomainProxy } from './http-proxy.js'
import createInspector from './inspector.js'
import { braveNodeType, releaseBraveEndpoint, useBraveEndpoint } from './ipfs-client/brave.js'
import { destroyIpfsClient, initIpfsClient, reloadIpfsClientOfflinePages } from './ipfs-client/index.js'
import { browserActionFilesCpImportCurrentTab, createIpfsImportHandler, formatImportDirectory } from './ipfs-import.js'
import { createIpfsPathValidator, dropSlash, safeHostname, sameGateway } from './ipfs-path.js'
import { createRequestModifier } from './ipfs-request.js'
import createNotifier from './notifier.js'
import { runPendingOnInstallTasks } from './on-installed.js'
import { guiURLString, migrateOptions, optionDefaults, safeURL, storeMissingOptions } from './options.js'
import { cleanupRules, getExtraInfoSpec } from './redirect-handler/blockOrObserve.js'
import createRuntimeChecks from './runtime-checks.js'
import { initState, offlinePeerCount } from './state.js'

// this won't work in webworker context. Needs to be enabled manually
// https://github.com/debug-js/debug/issues/916
const log = debug('ipfs-companion:main')
log.error = debug('ipfs-companion:main:error')

let browserActionPort // reuse instance for status updates between on/off toggles

// init happens on addon load in background/background.js
export default async function init (inQuickImport = false) {
  // INIT
  // ===================================================================
  let ipfs // ipfs-api instance
  /** @type {import('../types/companion.js').CompanionState} */
  let state // avoid redundant API reads by utilizing local cache of various states
  let dnslinkResolver
  let ipfsPathValidator
  let modifyRequest
  let notify
  let copier
  let inspector
  let runtime
  let contextMenus
  let apiStatusUpdateInterval
  let ipfsImportHandler
  const idleInSecs = 5 * 60
  const browserActionPortName = 'browser-action-port'

  try {
    log('init')
    await storeMissingOptions(await browser.storage.local.get(), optionDefaults, browser.storage.local)
    await migrateOptions(browser.storage.local, debug)
    const options = await browser.storage.local.get(optionDefaults)
    runtime = await createRuntimeChecks(browser)

    state = initState(options)
    notify = createNotifier(getState)

    if (state.active) {
      // It's ok for this to fail, node might be unavailable or mis-configured
      try {
        await handleConsentFromState(state)
        ipfs = await initIpfsClient(browser, state, inQuickImport)
        trackView('init')
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
    if (!inQuickImport) {
      contextMenus = createContextMenus(getState, runtime, ipfsPathValidator, {
        onAddFromContext,
        onCopyCanonicalAddress: copier.copyCanonicalAddress,
        onCopyRawCid: copier.copyRawCid,
        onCopyAddressAtPublicGw: copier.copyAddressAtPublicGw
      })
    }
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
    log('register all listeners')
    registerListeners()
    await registerSubdomainProxy(getState, runtime, notify)
    log('init done')
    setApiStatusUpdateInterval(options.ipfsApiPollMs)
    await runPendingOnInstallTasks()
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
    const onBeforeSendInfoSpec = ['requestHeaders']
    if (browser.webRequest.OnBeforeSendHeadersOptions && 'EXTRA_HEADERS' in browser.webRequest.OnBeforeSendHeadersOptions) {
      // Chrome 72+  requires 'extraHeaders' for accessing all headers
      // Note: we need this for code ensuring kubo-rpc-client can talk to API without setting CORS
      onBeforeSendInfoSpec.push('extraHeaders')
    }
    browser.webRequest.onBeforeSendHeaders.addListener(
      onBeforeSendHeaders, { urls: ['<all_urls>'] }, getExtraInfoSpec(onBeforeSendInfoSpec))
    browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ['<all_urls>'] }, getExtraInfoSpec())
    browser.webRequest.onHeadersReceived.addListener(onHeadersReceived, { urls: ['<all_urls>'] }, getExtraInfoSpec(['responseHeaders']))
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
      log('native protocol handler support detected, but IPFS handler is not implemented yet :-(')
    } else {
      log('no browser.protocol API, native protocol will not be registered')
    }
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

  async function onRuntimeMessage (request, sender) {
    // console.log((sender.tab ? 'Message from a content script:' + sender.tab.url : 'Message from the extension'), request)
    if (request.pubGwUrlForIpfsOrIpnsPath) {
      const path = request.pubGwUrlForIpfsOrIpnsPath
      const { validIpfsOrIpns, resolveToPublicUrl } = ipfsPathValidator
      const result = await validIpfsOrIpns(path) ? await resolveToPublicUrl(path) : null
      return { pubGwUrlForIpfsOrIpnsPath: result }
    }
    if (request.telemetry) {
      return Promise.resolve(onTelemetryMessage(request.telemetry))
    }
  }

  function onTelemetryMessage (request) {
    if (request.trackView) {
      const { version } = browser.runtime.getManifest()
      return trackView(request.trackView, { version })
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
  const resolveCache = new LRU({ max: 10, ttl: 1000 * 30 })

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
    [browserActionFilesCpImportCurrentTab]: () => ipfsImportHandler.filesCpImportCurrentTab(browser),
    [contextMenuViewOnGateway]: inspector.viewOnGateway,
    [contextMenuCopyCanonicalAddress]: copier.copyCanonicalAddress,
    [contextMenuCopyCidAddress]: copier.copyCidAddress,
    [contextMenuCopyRawCid]: copier.copyRawCid,
    [contextMenuCopyAddressAtPublicGw]: copier.copyAddressAtPublicGw,
    [contextMenuCopyPermalink]: copier.copyPermalink
  }

  function handleMessageFromBrowserAction (message) {
    const handler = BrowserActionMessageHandlers[message && message.event]
    if (!handler) return console.warn('Unknown browser action message event', message)
    handler(message)
  }

  async function fetchKuboRpcBackendVersion () {
    // prefer AgentVersion string from 'ipfs id' , but if that fails, use 'ipfs version'
    try {
      const { agentVersion } = await ipfs.id()
      if (agentVersion) {
        return agentVersion
      }
      const { version, commit } = await ipfs.version()
      if (version || commit) {
        return [version, commit].filter(Boolean).join('/')
      }
    } catch (_) {}
    return null
  }

  async function sendStatusUpdateToBrowserAction () {
    if (!browserActionPort) return
    const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
    const { version } = browser.runtime.getManifest()
    const info = {
      active: state.active,
      ipfsNodeType: state.ipfsNodeType,
      peerCount: state.peerCount,
      gwURLString: dropSlash(state.gwURLString),
      pubGwURLString: dropSlash(state.pubGwURLString),
      webuiRootUrl: dropSlash(state.webuiRootUrl),
      importDir: state.importDir,
      openViaWebUI: state.openViaWebUI,
      apiURLString: dropSlash(state.apiURLString),
      redirect: state.redirect,
      enabledOn: state.enabledOn,
      disabledOn: state.disabledOn,
      newVersion: state.dismissedUpdate !== version ? version : null,
      currentTab
    }

    info.kuboRpcBackendVersion = await fetchKuboRpcBackendVersion()

    if (state.active && info.currentTab) {
      const url = info.currentTab.url
      info.isIpfsContext = ipfsPathValidator.isIpfsPageActionsContext(url)
      if (info.isIpfsContext) {
        info.currentTabPublicUrl = await ipfsPathValidator.resolveToPublicUrl(url)
        info.currentTabContentPath = ipfsPathValidator.resolveToIpfsPath(url)
        if (resolveCache.has(url)) {
          const [immutableIpfsPath, permalink, cid] = resolveCache.get(url)
          info.currentTabImmutablePath = immutableIpfsPath
          info.currentTabPermalink = permalink
          info.currentTabCid = cid
        } else {
          // run async resolution in the next event loop so it does not block the UI
          setTimeout(async () => {
            resolveCache.set(url, [
              await ipfsPathValidator.resolveToImmutableIpfsPath(url),
              await ipfsPathValidator.resolveToPermalink(url),
              await ipfsPathValidator.resolveToCid(url)
            ])
            await sendStatusUpdateToBrowserAction()
          }, 0)
        }
      }
      info.currentDnslinkFqdn = await dnslinkResolver.findDNSLinkHostname(url)
      info.currentFqdn = info.currentDnslinkFqdn || safeHostname(url)
      info.currentTabIntegrationsOptOut = !state.activeIntegrations(info.currentFqdn)
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
    const {
      copyImportResultsToFiles,
      copyShareLink,
      preloadFilesAtPublicGateway,
      openFilesAtGateway,
      openFilesAtWebUI
    } = ipfsImportHandler
    const importDir = formatImportDirectory(state.importDir)
    let data
    let results
    try {
      const dataSrc = await findValueForContext(context, contextType)
      if (contextType === 'selection') {
        // TODO: persist full pageUrl somewhere (eg. append at the end of the content but add toggle to disable it)
        data = {
          path: `${new URL(context.pageUrl).hostname}.txt`,
          content: dataSrc
        }
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
        const url = new URL(response.url)
        // https://github.com/ipfs-shipyard/ipfs-companion/issues/599
        const filename = url.pathname === '/'
          ? url.hostname
          : url.pathname.replace(/[\\/]+$/, '').split('/').pop()
        data = {

          path: decodeURIComponent(filename),
          content: blob
        }
      }

      results = await all(ipfs.addAll([data], options))
      copyShareLink(results)
      preloadFilesAtPublicGateway(results)

      await copyImportResultsToFiles(results, importDir)
      if (!state.openViaWebUI) {
        await openFilesAtGateway(importDir)
      } else {
        await openFilesAtWebUI(importDir)
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
    }
  }

  // Page-specific Actions
  // -------------------------------------------------------------------

  async function onWindowFocusChanged (windowId) {
    // Note: On some Linux window managers, WINDOW_ID_NONE will always be sent
    // immediately preceding a switch from one browser window to another.
    if (windowId !== browser.windows.WINDOW_ID_NONE) {
      const currentTab = await browser.tabs.query({ active: true, windowId }).then(tabs => tabs[0])
      if (!inQuickImport) {
        await contextMenus.update(currentTab.id)
      }
    }
  }

  async function onActivatedTab (activeInfo) {
    if (!inQuickImport) {
      await contextMenus.update(activeInfo.tabId)
    }
  }

  async function onNavigationCommitted (details) {
    if (!inQuickImport) {
      await contextMenus.update(details.tabId)
    }
    await updatePageActionIndicator(details.tabId, details.url)
  }

  async function updatePageActionIndicator (tabId, url) {
    // Chrome does not permit for both pageAction and browserAction to be enabled at the same time
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/398
    if (runtime.isFirefox && ipfsPathValidator.isIpfsPageActionsContext(url)) {
      if (sameGateway(url, state.gwURL) || sameGateway(url, state.apiURL)) {
        await browser.pageAction.setIcon({ tabId, path: '/icons/ipfs-logo-on.svg' })
        await browser.pageAction.setTitle({ tabId, title: browser.i18n.getMessage('pageAction_titleIpfsAtCustomGateway') })
      } else {
        await browser.pageAction.setIcon({ tabId, path: '/icons/ipfs-logo-off.svg' })
        await browser.pageAction.setTitle({ tabId, title: browser.i18n.getMessage('pageAction_titleIpfsAtPublicGateway') })
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
    // Ensure Brave uses correct API
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
    await Promise.all([
      updateAutomaticModeRedirectState(oldPeerCount, state.peerCount),
      updateBrowserActionBadge(),
      sendStatusUpdateToBrowserAction(),
      () => {
        if (!inQuickImport) {
          contextMenus.update()
        }
      }
    ])
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
    if (typeof browser.action.setBadgeBackgroundColor === 'undefined') {
      // Firefox for Android does not have this UI, so we just skip it
      return
    }

    let badgeText, badgeColor, badgeIcon

    badgeText = ''
    if (state.peerCount > 0) {
      // All is good (online with peers)
      badgeColor = '#418B8E'
      badgeIcon = '/icons/ipfs-logo-on.svg'

      // prevent text overflow when peer count has more than 3 digits
      badgeText = (state.peerCount > 999) ? (Math.floor(state.peerCount / 1000).toString() + 'k') : state.peerCount.toString()
    } else if (state.peerCount === 0) {
      // API is online but no peers
      badgeColor = 'red'
      badgeIcon = '/icons/ipfs-logo-on.svg'
    } else {
      // API is offline
      badgeColor = '#8C8C8C'
      badgeIcon = '/icons/ipfs-logo-off.svg'
    }
    try {
      const oldColor = colorArraytoHex(await browser.action.getBadgeBackgroundColor({}))
      if (badgeColor !== oldColor) {
        await cleanupRules(true)
        await browser.action.setBadgeBackgroundColor({ color: badgeColor })
        await setBrowserActionIcon(badgeIcon)
      }
      const oldText = await browser.action.getBadgeText({})
      if (oldText !== badgeText) await browser.action.setBadgeText({ text: badgeText })
    } catch (error) {
      console.error('Unable to update browserAction badge due to error', error)
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

  async function setBrowserActionIcon (iconPath) {
    let iconDefinition = { path: iconPath }
    try {
      // Try SVG first -- Firefox supports it natively
      await browser.action.setIcon(iconDefinition)
      if (browser.runtime.lastError.message === 'Icon invalid.') {
        throw browser.runtime.lastError
      }
    } catch (error) {
      // Fallback!
      // Chromium does not support SVG [ticket below is 8 years old, I can't even..]
      // https://bugs.chromium.org/p/chromium/issues/detail?id=29683
      // Still, we want icon, so we precompute rasters of popular sizes and use them instead

      iconDefinition = await rasterIconDefinition(iconPath)
      await browser.action.setIcon(iconDefinition)
    }
  }

  // OPTIONS
  // ===================================================================

  async function updateAutomaticModeRedirectState (oldPeerCount, newPeerCount) {
    // enable/disable gw redirect based on API going online or offline
    if (state.automaticMode && state.localGwAvailable) {
      if (oldPeerCount === offlinePeerCount && newPeerCount > offlinePeerCount && !state.redirect) {
        await browser.storage.local.set({ useCustomGateway: true })

        reloadIpfsClientOfflinePages(browser, ipfs, state)
      } else if (newPeerCount === offlinePeerCount && state.redirect) {
        await browser.storage.local.set({ useCustomGateway: false })
      }
    }
  }

  async function onStorageChange (changes) {
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
          await registerSubdomainProxy(getState, runtime)
          shouldRestartIpfsClient = true
          shouldStopIpfsClient = !state.active
          break
        case 'ipfsNodeType':
          if (change.oldValue !== braveNodeType && change.newValue === braveNodeType) {
            useBraveEndpoint(browser)
          } else if (change.oldValue === braveNodeType && change.newValue !== braveNodeType) {
            releaseBraveEndpoint(browser)
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
        default:
          state[key] = change.newValue
          break
      }
    }
    // ensure consent is set properly on state changes
    handleConsentFromState(state)

    if ((state.active && shouldRestartIpfsClient) || shouldStopIpfsClient) {
      try {
        log('stoping ipfs client due to config changes', changes)
        await destroyIpfsClient(browser)
      } catch (err) {
        console.error('[ipfs-companion] Failed to destroy IPFS client', err)

        notify('notify_stopIpfsNodeErrorTitle', err.message)
      } finally {
        ipfs = null
      }

      if (!state.active) return

      try {
        log('starting ipfs client with the new config')
        ipfs = await initIpfsClient(browser, state)
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
    log('storage change processed')

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

    async destroy () {
      if (state) {
        state.active = false
        state.peerCount = -1 // api down
      }

      if (apiStatusUpdateInterval) {
        clearInterval(apiStatusUpdateInterval)
        apiStatusUpdateInterval = null
      }

      if (ipfs) {
        await destroyIpfsClient(browser)
        ipfs = null
      }
    }
  }

  return api
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
