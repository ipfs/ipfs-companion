'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client:brave')
log.error = debug('ipfs-companion:client:brave:error')

const external = require('./external')
const toUri = require('multiaddr-to-uri')
const pWaitFor = require('p-wait-for')
const { welcomePage, optionsPage, tickMs } = require('../constants')

// increased interval to decrease impact of IPFS service process spawns
const waitFor = (f, t) => pWaitFor(f, { interval: tickMs, timeout: t || Infinity })

exports.init = async function (browser, opts) {
  log('ensuring Brave Settings are correct')
  const { brave } = exports
  await initBraveSettings(browser, brave)
  log('delegating API client init to "external" backend pointed at node managed by Brave')
  return external.init(browser, opts)
}

exports.destroy = async function (browser) {
  log('shuting down node managed by Brave')
  const { brave } = exports
  const method = await brave.getResolveMethodType()
  if (method === 'local') {
    // shut down local node when this backend is not active
    log('waiting for brave.shutdown() to finish')
    await waitFor(() => brave.shutdown())
    log('brave.shutdown() done')
  }
  log('delegating API client destroy to "external" backend pointed at node managed by Brave')
  return external.destroy(browser)
}

// ---------------- Brave-specifics -------------------

// ipfs:// URI that will be used for triggering the "Enable IPFS" dropbar in Brave
// Here we use inlined empty byte array, which resolves instantly and does not
// introduce any delay in UI.
const braveIpfsUriTrigger = 'ipfs://bafkqaaa/'
const braveGatewayUrlTrigger = 'https://bafkqaaa.ipfs.dweb.link/'

// Settings screen in Brave where user can manage IPFS support
const braveSettingsPage = 'brave://settings/extensions'
// TODO: replace with brave://settings/ipfs after https://github.com/brave/brave-browser/issues/13655 lands in Brave Stable

// Diagnostic page for manually starting/stopping Brave's node
// const braveIpfsDiagnosticPage = 'brave://ipfs' // TODO: https://github.com/brave/brave-browser/issues/14500

// ipfsNodeType for this backend
exports.braveNodeType = 'external:brave'

// wrapper for chrome.ipfs.* that gets us closer to ergonomics of promise-based browser.*
exports.brave = hasBraveChromeIpfs()
  ? Object.freeze({
      // This is the main check - returns true only in Brave and only when
      // feature flag is enabled brave://flags and can be used for high level UI
      // decisions such as showing custom node type on Preferences
      getIPFSEnabled: async () =>
        Boolean(await promisifyBraveCheck(chrome.ipfs.getIPFSEnabled)),

      // Obtains a string representation of the resolve method
      // method is one of the following strings:
      // "ask" uses a gateway but also prompts them to install a local node
      // "gateway" uses a gateway but also prompts them to install a local node
      // "local" uses a gateway but also prompts them to install a local node
      // "disabled" disabled by the user
      // "undefined" everything else (IPFS feature flag is not enabled, error etc)
      getResolveMethodType: async () =>
        String(await promisifyBraveCheck(chrome.ipfs.getResolveMethodType)),

      // Obtains the config contents of the local IPFS node
      // Returns undefined if missing for any reason
      getConfig: async () =>
        await promisifyBraveCheck(chrome.ipfs.getConfig),

      // Returns true if binary is present
      getExecutableAvailable: async () =>
        Boolean(await promisifyBraveCheck(chrome.ipfs.getExecutableAvailable)),

      // Attempts to start the daemon and returns true if finished
      launch: async () =>
        Boolean(await promisifyBraveCheck(chrome.ipfs.launch)),

      // Attempts to stop the daemon and returns true if finished
      shutdown: async () =>
        Boolean(await promisifyBraveCheck(chrome.ipfs.shutdown))
    })
  : undefined

// Detect chrome.ipfs.* APIs provided by Brave to IPFS Companion
function hasBraveChromeIpfs () {
  return typeof chrome === 'object' &&
    typeof chrome.ipfs === 'object' &&
    typeof chrome.ipfs.getIPFSEnabled === 'function' &&
    typeof chrome.ipfs.getResolveMethodType === 'function' &&
    typeof chrome.ipfs.launch === 'function' &&
    typeof chrome.ipfs.shutdown === 'function' &&
    typeof chrome.ipfs.getExecutableAvailable === 'function' &&
    typeof chrome.ipfs.getConfig === 'function'
}

// Reads value via chrome.ipfs and returns it.
// Never throws: missing/error is returned as undefined.
const promisifyBraveCheck = (fn) => {
  return new Promise((resolve, reject) => {
    try {
      if (fn === chrome.ipfs.getConfig) {
        fn((ok, config) => {
          if (ok && config) return resolve(JSON.parse(config))
          return resolve(undefined)
        })
      }
      fn(val => resolve(val))
    } catch (e) {
      log.error('unexpected error during promisifyBraveCheck', e)
      reject(e)
    }
  })
}

// We preserve original "external" config, so user can switch between
// nodes provided by Brave and IPFS Desktop without the need for
// manually editing the address of IPFS API endpoint.

exports.useBraveEndpoint = async function (browser) {
  const { brave } = exports
  const braveConfig = await brave.getConfig()
  if (typeof braveConfig === 'undefined') {
    log.error('useBraveEndpoint: IPFS_PATH/config is missing, unable to use endpoint from Brave at this time, will try later')
    return
  }

  const {
    externalNodeConfig: oldExternalNodeConfig,
    customGatewayUrl: oldGatewayUrl,
    ipfsApiUrl: oldApiUrl
  } = (await browser.storage.local.get(['customGatewayUrl', 'ipfsApiUrl', 'externalNodeConfig']))
  const braveApiUrl = addrs2url(braveConfig.Addresses.API)
  const braveGatewayUrl = addrs2url(braveConfig.Addresses.Gateway)

  if (braveApiUrl === oldApiUrl && braveGatewayUrl === oldGatewayUrl) {
    log('useBraveEndpoint: ok')
    return
  }

  log(`useBraveEndpoint: setting api=${braveApiUrl}, gw=${braveGatewayUrl} (before: api=${oldApiUrl}, gw=${oldGatewayUrl})`)
  await browser.storage.local.set({
    ipfsApiUrl: braveApiUrl,
    customGatewayUrl: braveGatewayUrl,
    externalNodeConfig: oldExternalNodeConfig || [oldGatewayUrl, oldApiUrl]
  })
}

exports.releaseBraveEndpoint = async function (browser) {
  const [oldGatewayUrl, oldApiUrl] = (await browser.storage.local.get('externalNodeConfig')).externalNodeConfig
  log(`releaseBraveEndpoint: restoring api=${oldApiUrl}, gw=${oldGatewayUrl}`)
  await browser.storage.local.set({
    ipfsApiUrl: oldApiUrl,
    customGatewayUrl: oldGatewayUrl,
    externalNodeConfig: null
  })
}

// Addresses in go-ipfs config can be a String or array of strings with multiaddrs
function addrs2url (addr) {
  if (Array.isArray(addr)) {
    addr = addr[0]
  }
  return toUri(addr, { assumeHttp: true })
}

async function initBraveSettings (browser, brave) {
  let method = await brave.getResolveMethodType()
  log(`brave.resolveMethodType is '${method}'`)

  if (method === 'ask') {
    // Trigger the dropbar with "Enable IPFS" button by opening ipfs:// URI in a new tab.
    await browser.tabs.create({ url: braveIpfsUriTrigger })

    // IPFS Companion is unable to change Brave settings,
    // all we can do is to poll chrome.ipfs.* and detect when user made a decision
    log('waiting for user to make a decision how IPFS resources should be resolved')
    await waitFor(async () => {
      method = await brave.getResolveMethodType()
      return method && method !== 'ask'
    })
    log(`user set resolveMethodType to '${method}'`)

    if (method === 'local') {
      log('waiting while Brave downloads IPFS executable..')
      await waitFor(() => brave.getExecutableAvailable())

      log('waiting while Brave creates repo and config via ipfs init..')
      await waitFor(async () => typeof (await brave.getConfig()) !== 'undefined')
    }
  }

  if (method !== 'local') {
    // user picked remote gateway mode, turn Companion off for now
    // (this way clicking power button in browser action menu will re-run activation flow)
    await browser.storage.local.set({ active: false })
    // close tab with temporary trigger URI
    await closeIpfsTab(browser, braveIpfsUriTrigger)
    await closeIpfsTab(browser, braveGatewayUrlTrigger)
    // open settings
    await browser.tabs.create({ url: braveSettingsPage })
    throw new Error('"Method to resolve IPFS resources" in Brave settings should be "Local node"')
  }

  // ensure local node is started
  log('waiting while brave.launch() starts ipfs daemon..')
  await waitFor(() => brave.launch())
  log('brave.launch() finished')

  // ensure Companion uses the endpoint provided by Brave
  await exports.useBraveEndpoint(browser)

  // async UI cleanup, after other stuff
  setTimeout(() => activationUiCleanup(browser), tickMs)
}

// close tab in a way that works with ipfs://
async function closeIpfsTab (browser, tabUrl) {
  // fun bug: querying for { url: 'ipfs://..' } does not work,
  // but if we query for { } ipfs:// tabs are returned just fine,
  // so we do that and discard unwanted ones  ¯\_(ツ)_/¯
  // TODO: fix chrome.tabs.query when we care about upstreaming things to Chromium
  for (const tab of await browser.tabs.query({})) {
    if (tab.url === tabUrl) {
      await browser.tabs.remove(tab.id)
    }
  }
}

// Various tedious tasks that need to happen for nice UX:
// - wait for gateway to be up (indicates node finished booting)
// - close ephemeral activation tab
// - re-activate entry point (options or welcome page)
// - ignore unexpected failures (user could do something weird, close tab before time etc)
async function activationUiCleanup (browser) {
  try {
    // after useBraveEndpoint we can start polling for gateway to become online
    const { customGatewayUrl: braveGwUrl } = await browser.storage.local.get('customGatewayUrl')
    // wait 1m for gateway to be online (bafkqaaa)
    await waitFor(async () => {
      try {
        return await fetch(`${braveGwUrl}/ipfs/bafkqaaa`).then(response => response.ok)
      } catch (_) {
        return false
      }
    })
    log('[activation ui cleanup] Brave gateway is up, cleaning up')

    const welcomePageUrl = browser.extension.getURL(welcomePage)
    const optionsPageUrl = browser.extension.getURL(optionsPage)
    // we are unable to query ipfs:// directly due to reasons mentioned in 'closeIpfsTab'
    // so we make quick pass over all tabs and check welcome and options while at it.
    for (const tab of await browser.tabs.query({})) {
      try {
        // close tab with temporary trigger
        if (tab.url === braveIpfsUriTrigger || tab.url === braveGatewayUrlTrigger) {
          await browser.tabs.remove(tab.id)
        }
        // switch to welcome page if present (onboarding via fresh install)
        if (tab.url === welcomePageUrl) {
          await browser.tabs.reload(tab.id)
          await browser.tabs.update(tab.id, { active: true })
        }
        // switch to options page if present (onboarding via Preferences)
        if (tab.url === optionsPageUrl) {
          await browser.tabs.update(tab.id, { active: true })
        }
      } catch (e) {
        log.error('[activation ui cleanup] unexpected error, but safe to ignore', e)
        continue
      }
    }
    log('[activation ui cleanup] done')

    // (if ok or not, close temporary tab and switch to welcome page or open it if not existing
    // if ((await browser.tabs.get(tabId)).url.startsWith(braveIpfsUriTrigger)) {
  } catch (e) {
    // most likely tab is gone (closed by user, etc)
    log.error('[activation ui cleanup] failed to cleanup ephemeral UI tab', e)
  }
}
