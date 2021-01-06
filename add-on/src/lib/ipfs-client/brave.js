'use strict'
/* eslint-env browser, webextensions */

const debug = require('debug')
const log = debug('ipfs-companion:client:brave')
log.error = debug('ipfs-companion:client:brave:error')

const external = require('./external')
const toUri = require('multiaddr-to-uri')
const pWaitFor = require('p-wait-for')

// increased interval to decrease impact of IPFS service process spawns
const waitFor = (f, t) => pWaitFor(f, { interval: 250, timeout: t || Infinity })

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
const braveIpfsUriTrigger = 'ipfs://bafkreigxbf77se2an2u6hmg2kxxbhmenetc7dzvkd3rl4m2orlobjvqcqq'

// Settings screen in Brave where user can manage IPFS support
const braveSettingsPage = 'brave://settings/extensions'

// Diagnostic page for manually starting/stopping Brave's node
// const braveIpfsDiagnosticPage = 'brave://ipfs'

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
  let showState = () => {}
  let tabId
  let method = await brave.getResolveMethodType()
  log(`brave.resolveMethodType is '${method}'`)

  if (method === 'ask') {
    // Trigger the dropbar with "Enable IPFS" button by opening ipfs:// URI in a new tab.
    // The trigger is a HTML page with some text to make onboarding easier.
    tabId = (await browser.tabs.create({ url: braveIpfsUriTrigger })).id

    // Reuse the tab for state updates (or create a new one if user closes it)
    // Caveat: we inject JS as we can't use tab.update during the init of local gateway
    // because Brave will try to use it and fail as it is not ready yet :-))
    showState = async (s) => {
      try {
        await browser.tabs.executeScript(tabId, { code: `window.location.hash = '#${s}';` })
      } catch (e) { // noop, just log, don't break if user closed the tab etc
        log.error('error while showState', e)
      }
    }
    showState('ask')

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
      showState('download')
      await waitFor(() => brave.getExecutableAvailable())

      log('waiting while Brave creates repo and config via ipfs init..')
      await showState('init')
      await waitFor(async () => typeof (await brave.getConfig()) !== 'undefined')
    }
  }

  if (method !== 'local') {
    await showState('ask')
    await browser.tabs.create({ url: braveSettingsPage })
    throw new Error('"Method to resolve IPFS resources" in Brave settings should be "Local node"')
  }

  // ensure local node is started
  log('waiting while brave.launch() starts ipfs daemon..')
  await showState('start')
  await waitFor(() => brave.launch())
  log('brave.launch() finished')
  await showState('done')

  // ensure Companion uses the endpoint provided by Brave
  await exports.useBraveEndpoint(browser)
}
