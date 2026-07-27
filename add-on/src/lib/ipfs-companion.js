'use strict'

import debug from 'debug'

import all from 'it-all'
import { LRUCache } from 'lru-cache'
import pMemoize from 'p-memoize'
import toMultiaddr from './uri-to-multiaddr.js'
import browser from 'webextension-polyfill'
import { contextMenuCopyAddressAtPublicGw, contextMenuCopyCanonicalAddress, contextMenuCopyCidAddress, contextMenuCopyPermalink, contextMenuCopyRawCid, contextMenuViewOnGateway, createContextMenus, findValueForContext } from './context-menus.js'
import createCopier from './copier.js'
import createDnslinkResolver from './dnslink.js'
import { registerSubdomainProxy } from './http-proxy.js'
import createInspector from './inspector.js'
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

// Upper bound for a single popup DAG-data resolution before we give up and show
// an "unavailable" hint. Kept above resolveToCid's own 5s DHT budget so a normal
// lookup finishes well within it, while a wedged node cannot hang the UI (#1334).
const dagResolveTimeout = 15000

// Reject `promise` if it does not settle within `ms`, always clearing the timer.
async function withTimeout (promise, ms, label) {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  // if the timeout wins the race, `promise` keeps running; swallow a late
  // rejection so it does not surface as an unhandled promise rejection
  promise.catch(() => {})
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

// Open popup / landing-page connections that want live status pushed to them.
// A Set so an open welcome page and an open popup can coexist, and closing one
// does not stop the fast poll the other still needs.
const browserActionPorts = new Set()

// Alarm that wakes a dormant MV3 service worker to refresh RPC status.
// Registered synchronously in background/background.js so a wake is never missed.
export const kuboRpcStatusAlarmName = 'kubo-rpc-status'

// Two user options drive status polling, both in seconds (see optionDefaults):
// ipfsApiPollForegroundSeconds while a Companion window is open, and
// ipfsApiPollBackgroundSeconds for the heartbeat when none is. While the user is
// away we poll at a multiple of the background interval; the badge still
// recovers immediately on any presence event, so no faster offline tier is
// needed.
const IDLE_POLL_MULTIPLIER = 5

// browser.alarms schedules in minutes and enforces a 30s floor.
const STATUS_ALARM_MIN_SECONDS = 30
const secondsToAlarmMinutes = (s) => Math.max(STATUS_ALARM_MIN_SECONDS, s) / 60

// Time with no keyboard or mouse input before the user counts as "away".
// browser.idle works in seconds with a 15s floor; this is comfortably above it.
const IDLE_THRESHOLD_SECONDS = 5 * 60

// Tolerate this many consecutive failed polls before flipping the toolbar icon
// to "offline", so one slow swarm.peers call or a resume-from-sleep race does
// not paint it grey and then stick there.
const API_FAILURE_THRESHOLD = 2

// Focus, navigation and popup-open all request an immediate refresh; this
// debounce collapses a burst of them into at most one extra poll.
const FOREGROUND_POLL_DEBOUNCE_MS = 2000

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
  let browserActionPollInterval // fast poll kept alive only while the popup is open
  let fallbackPollInterval // background timer used only when browser.alarms is absent
  let ipfsImportHandler
  let consecutiveApiFailures = 0
  let lastStatusPollTs = 0
  const browserActionPortName = 'browser-action-port'

  try {
    log('init')
    await storeMissingOptions(await browser.storage.local.get(), optionDefaults, browser.storage.local)
    await migrateOptions(browser.storage.local, debug)
    const options = await browser.storage.local.get(optionDefaults)
    runtime = await createRuntimeChecks(browser)

    state = initState(options)
    notify = createNotifier(getState)

    // Enable debug namespaces on initialization
    if (state.logNamespaces) {
      debug.enable(state.logNamespaces)
    } else {
      debug.disable()
    }

    if (state.active) {
      // It's ok for this to fail, node might be unavailable or mis-configured
      try {
        ipfs = await initIpfsClient(browser, state, inQuickImport)
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
    await startApiStatusUpdates()
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

    // Note: the kubo-rpc-status alarm listener is registered synchronously in
    // background/background.js. In MV3 a listener that must wake a dormant
    // service worker has to be attached in the first tick of the top-level
    // script, before this async init runs, or the wake event can be dropped.

    // Relax the status heartbeat while idle and snap back on return.
    if (browser.idle) {
      browser.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS)
      browser.idle.onStateChanged.addListener(onIdleStateChanged)
    }

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
      const { validIpfsOrIpns, resolveToPublicUrl, resolveToLocalUrl } = ipfsPathValidator
      let result = null
      if (await validIpfsOrIpns(path)) {
        // linkified hrefs must be loadable http(s) URLs; with no public gateway
        // configured the resolver returns a native URI, use the local gateway then
        const publicUrl = await resolveToPublicUrl(path)
        result = publicUrl && publicUrl.startsWith('http') ? publicUrl : resolveToLocalUrl(path)
      }
      return { pubGwUrlForIpfsOrIpnsPath: result }
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
  const resolveCache = new LRUCache({ max: 10, ttl: 1000 * 30 })

  function onRuntimeConnect (port) {
    // console.log('onConnect', port)
    if (port.name === browserActionPortName) {
      browserActionPorts.add(port)
      port.onMessage.addListener(handleMessageFromBrowserAction)
      port.onDisconnect.addListener(() => onBrowserActionPortDisconnect(port))
      sendStatusUpdateToBrowserAction()
      // While a popup or the welcome page is open the user is watching live peer
      // counts, so poll on the fast Status Poll Interval. The open port also
      // keeps the service worker alive for as long as it stays connected.
      startBrowserActionPoll()
    }
  }

  function onBrowserActionPortDisconnect (port) {
    browserActionPorts.delete(port)
    if (browserActionPorts.size === 0) stopBrowserActionPoll()
  }

  function startBrowserActionPoll () {
    requestStatusRefresh()
    if (browserActionPollInterval) return
    browserActionPollInterval = setInterval(apiStatusUpdate, state.ipfsApiPollForegroundSeconds * 1000)
  }

  function stopBrowserActionPoll () {
    if (browserActionPollInterval) {
      clearInterval(browserActionPollInterval)
      browserActionPollInterval = null
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
    if (browserActionPorts.size === 0) return
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
        info.currentTabPublicUrl = await ipfsPathValidator.resolveToShareableUrl(url)
        info.currentTabContentPath = ipfsPathValidator.resolveToIpfsPath(url)
        if (resolveCache.has(url)) {
          const cached = resolveCache.get(url)
          if (cached.error) {
            // resolution failed or timed out; show a definite state instead of
            // leaving the placeholder spinning forever (see #1334)
            const unavailable = browser.i18n.getMessage('panelCopy_notAvailableHint')
            info.currentTabImmutablePath = unavailable
            info.currentTabPermalink = unavailable
            info.currentTabCid = unavailable
          } else {
            info.currentTabImmutablePath = cached.immutableIpfsPath
            // resolve the permalink fresh so it tracks the share toggle; the costly
            // DAG lookup underneath is memoized, so this stays cheap
            info.currentTabPermalink = await ipfsPathValidator.resolveToPermalink(url)
            info.currentTabCid = cached.cid
          }
        } else {
          // run async resolution in the next event loop so it does not block the UI.
          // a timeout guards against an unresponsive node, and any failure is cached
          // so the popup settles on a definite state instead of the placeholder
          setTimeout(async () => {
            try {
              const [immutableIpfsPath, cid] = await withTimeout(
                Promise.all([
                  ipfsPathValidator.resolveToImmutableIpfsPath(url),
                  ipfsPathValidator.resolveToCid(url)
                ]),
                dagResolveTimeout,
                'DAG data resolution'
              )
              resolveCache.set(url, { immutableIpfsPath, cid })
            } catch (err) {
              log.error(`failed to resolve DAG data for ${url}`, err)
              // cache the error only briefly: long enough to show a definite
              // hint and avoid a hot retry loop, short enough that a recovered
              // node is picked up on the next poll instead of after the full TTL
              resolveCache.set(url, { error: true }, { ttl: 3000 })
            }
            await sendStatusUpdateToBrowserAction()
          }, 0)
        }
      }
      info.currentDnslinkFqdn = await dnslinkResolver.findDNSLinkHostname(url)
      info.currentFqdn = info.currentDnslinkFqdn || safeHostname(url)
      info.currentTabIntegrationsOptOut = !state.activeIntegrations(info.currentFqdn)
      info.isRedirectContext = info.currentFqdn && ipfsPathValidator.isRedirectPageActionsContext(url)
    }
    // Broadcast to every open connection; drop any that closed mid-build.
    for (const port of browserActionPorts) {
      try {
        port.postMessage({ statusUpdate: info })
      } catch (_) {
        browserActionPorts.delete(port)
      }
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
      requestStatusRefresh()
      const currentTab = await browser.tabs.query({ active: true, windowId }).then(tabs => tabs[0])
      if (!inQuickImport) {
        await contextMenus.update(currentTab.id)
      }
    }
  }

  async function onActivatedTab (activeInfo) {
    requestStatusRefresh()
    if (!inQuickImport) {
      await contextMenus.update(activeInfo.tabId)
    }
  }

  async function onNavigationCommitted (details) {
    if (details.frameId === 0) {
      // A top-level navigation means the user is here; refresh the badge so it
      // recovers quickly after idle or resume-from-sleep.
      requestStatusRefresh()
    }
    // Reclaim a top-level navigation that committed to a public gateway without
    // being redirected (e.g. a service worker gateway served it from cache).
    try {
      await modifyRequest.recoverRedirectMiss(details)
    } catch (err) {
      log.error('recoverRedirectMiss failed', err)
    }
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
  // The toolbar badge reflects the Kubo RPC peer count. In MV3 the service
  // worker is torn down after a short idle period, so a setInterval cannot be
  // relied on for background monitoring. A browser.alarms heartbeat drives the
  // background poll instead: it survives termination and wakes the worker. Its
  // cadence has two background tiers derived from the single background poll
  // interval (a Preferences option): the configured rate normally, and slower
  // while the user is idle. On top of that, user-presence events (window focus,
  // navigation, popup open) and returning from idle request an immediate
  // refresh, and an open Companion window polls on the foreground interval to
  // show live counts. The idle tier only backs off, never skips, so the badge
  // can never freeze and then fail to recover the way it did when an idle check
  // gated the poll entirely.

  async function startApiStatusUpdates () {
    await scheduleStatusAlarm(secondsToAlarmMinutes(state.ipfsApiPollBackgroundSeconds))
    // Resume the fast poll if a popup or welcome page is already open (e.g. the
    // extension was toggled back on while its UI was showing).
    if (browserActionPorts.size > 0) startBrowserActionPoll()
    await apiStatusUpdate()
  }

  // (Re)create the heartbeat alarm at the given period. Falls back to a plain
  // timer only where the alarms API is unavailable (e.g. unit tests).
  async function scheduleStatusAlarm (periodInMinutes) {
    if (browser.alarms) {
      await browser.alarms.clear(kuboRpcStatusAlarmName)
      await browser.alarms.create(kuboRpcStatusAlarmName, { periodInMinutes })
      return
    }
    if (fallbackPollInterval) clearInterval(fallbackPollInterval)
    fallbackPollInterval = setInterval(apiStatusUpdate, Math.round(periodInMinutes * 60000))
  }

  async function stopApiStatusUpdates () {
    if (browser.alarms) {
      await browser.alarms.clear(kuboRpcStatusAlarmName)
    }
    if (fallbackPollInterval) {
      clearInterval(fallbackPollInterval)
      fallbackPollInterval = null
    }
    stopBrowserActionPoll()
  }

  // Immediate refresh requested by a user-presence event, debounced so a burst
  // (e.g. focus followed by navigation) still triggers at most one extra poll.
  function requestStatusRefresh () {
    if (!state || !state.active) return
    if (Date.now() - lastStatusPollTs < FOREGROUND_POLL_DEBOUNCE_MS) return
    apiStatusUpdate()
  }

  async function apiStatusUpdate () {
    lastStatusPollTs = Date.now()
    const oldPeerCount = state.peerCount
    const wasOnline = oldPeerCount !== offlinePeerCount
    const polledPeerCount = await getSwarmPeerCount()

    if (polledPeerCount === offlinePeerCount) {
      consecutiveApiFailures++
      // Hold the last known good count through a single transient failure, so one
      // slow poll or a resume-from-sleep race does not flip the icon to offline.
      state.peerCount = (consecutiveApiFailures < API_FAILURE_THRESHOLD && wasOnline)
        ? oldPeerCount
        : offlinePeerCount
    } else {
      consecutiveApiFailures = 0
      state.peerCount = polledPeerCount
    }

    await adaptStatusAlarmCadence()
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

  // Poll faster while offline to catch recovery, back off once stable, and back
  // off harder while the user is idle.
  async function adaptStatusAlarmCadence () {
    if (!browser.alarms) return
    const wanted = await desiredAlarmPeriod()
    const existing = await browser.alarms.get(kuboRpcStatusAlarmName)
    if (existing && existing.periodInMinutes === wanted) return
    await scheduleStatusAlarm(wanted)
  }

  async function desiredAlarmPeriod () {
    // Poll less often while the user is away; a presence event or the
    // idle->active transition brings us straight back.
    const base = state.ipfsApiPollBackgroundSeconds
    const seconds = (await isBrowserIdle()) ? base * IDLE_POLL_MULTIPLIER : base
    return secondsToAlarmMinutes(seconds)
  }

  async function isBrowserIdle () {
    if (!browser.idle) return false
    try {
      // 'idle' after the idle threshold of no input, 'locked' when the screen
      // is locked; anything other than 'active' counts as idle for backoff.
      return (await browser.idle.queryState(IDLE_THRESHOLD_SECONDS)) !== 'active'
    } catch (error) {
      log.error('idle.queryState failed, assuming active', error)
      return false
    }
  }

  async function onIdleStateChanged (newState) {
    if (newState === 'active') {
      // User is back: poll now and let the poll restore the fast cadence.
      requestStatusRefresh()
    } else {
      // Went idle or locked: relax the heartbeat without polling.
      await adaptStatusAlarmCadence()
    }
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

  // browserAction
  // -------------------------------------------------------------------

  async function updateBrowserActionBadge () {
    if (typeof browser.action.setBadgeBackgroundColor === 'undefined') {
      // Firefox for Android does not have this UI, so we just skip it
      return
    }

    let badgeColor, badgeIcon

    // Connection state is shown through the toolbar icon only. The peer count is
    // deliberately not rendered as badge text: between polls it read as a fixed
    // number and looked broken. The background colour is still set (invisible
    // without text) as a persisted marker, so online<->offline transitions are
    // detected across service worker restarts and drive cleanupRules below.
    const badgeText = ''
    if (state.peerCount > 0) {
      // online with peers
      badgeColor = '#418B8E'
      badgeIcon = '/icons/ipfs-logo-on.svg'
    } else if (state.peerCount === 0) {
      // online but no peers
      badgeColor = 'red'
      badgeIcon = '/icons/ipfs-logo-on.svg'
    } else {
      // offline
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
        case 'ipfsApiPollForegroundSeconds':
          // Fast poll used while a Companion window is open. Restart it in place
          // if a window is currently connected.
          state.ipfsApiPollForegroundSeconds = change.newValue
          if (browserActionPollInterval) {
            clearInterval(browserActionPollInterval)
            browserActionPollInterval = setInterval(apiStatusUpdate, state.ipfsApiPollForegroundSeconds * 1000)
          }
          break
        case 'ipfsApiPollBackgroundSeconds':
          // Background heartbeat; the offline and idle tiers derive from it.
          state.ipfsApiPollBackgroundSeconds = change.newValue
          await adaptStatusAlarmCadence()
          break
        case 'customGatewayUrl':
          state.gwURL = safeURL(change.newValue, { useLocalhostName: state.useSubdomains })
          state.gwURLString = state.gwURL.toString()
          break
        case 'publicGatewayUrl':
          state.pubGwURL = change.newValue ? new URL(change.newValue) : undefined
          state.pubGwURLString = state.pubGwURL?.toString()
          break
        case 'publicSubdomainGatewayUrl':
          state.pubSubdomainGwURL = change.newValue ? new URL(change.newValue) : undefined
          state.pubSubdomainGwURLString = state.pubSubdomainGwURL?.toString()
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
        case 'logNamespaces':
          state[key] = change.newValue
          // Use debug.enable() API for both Manifest V2 and V3
          if (change.newValue) {
            debug.enable(change.newValue)
          } else {
            debug.disable()
          }
          break
        default:
          state[key] = change.newValue
          break
      }
    }

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

      // Stop API status updates when extension is disabled
      if (shouldStopIpfsClient) {
        log('stopping API status updates (extension disabled)')

        // Stop monitoring first
        await stopApiStatusUpdates()

        // Set offline state and update badge as the final action
        consecutiveApiFailures = 0
        state.peerCount = offlinePeerCount
        await updateBrowserActionBadge()
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

      // Restart API status updates when extension is re-enabled
      if (state.active && ipfs) {
        log('restarting API status updates (extension enabled)')
        consecutiveApiFailures = 0
        await startApiStatusUpdates()
      } else {
        apiStatusUpdate()
      }
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

    // Invoked by the synchronously-registered alarm listener in background.js
    // so a service-worker wake refreshes status without re-running full init.
    apiStatusUpdate,

    async destroy () {
      if (state) {
        state.active = false
        state.peerCount = -1 // api down
      }

      await stopApiStatusUpdates()

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
