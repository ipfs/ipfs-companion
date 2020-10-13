'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { safeURL } = require('./options')

const debug = require('debug')
const log = debug('ipfs-companion:http-proxy')
log.error = debug('ipfs-companion:http-proxy:error')

// Preface:
//
// When go-ipfs runs on localhost, it exposes two types of gateway:
// 127.0.0.1:8080 - old school path gateway
// localhost:8080 - subdomain gateway supporting Origins like $cid.ipfs.localhost
// More: https://docs.ipfs.io/how-to/address-ipfs-on-web/#subdomain-gateway
//
// In a web browser contexts we care about Origin per content root (CID)
// because entire web security model uses it as a basis for sandboxing and
// access controls:
// https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy

// registerSubdomainProxy is necessary wourkaround for supporting subdomains
// under 'localhost' (*.ipfs.localhost) because some operating systems do not
// resolve them to local IP and return NX error not found instead
//
// State in Q2 2020:
// - Chromium hardcodes `localhost` name to point at local IP and proxy is not
//   really necessary. The code is here (inactivE) in case we need it in the future.
// - Firefox requires proxy to avoid DNS lookup, but there is an open issue
//   that will remove that need at some point:
//   https://bugzilla.mozilla.org/show_bug.cgi?id=1220810
async function registerSubdomainProxy (getState, runtime, notify) {
  // At the moment only firefox requires proxy registration
  if (!runtime.isFirefox) return

  try {
    const { active, useSubdomains, gwURLString } = getState()
    const enable = active && useSubdomains

    // HTTP Proxy feature is exposed on the gateway port
    // Just ensure we use localhost IP to remove any dependency on DNS
    const { hostname, port } = safeURL(gwURLString, { useLocalhostName: false })

    // Firefox uses own APIs for selective proxying
    if (runtime.isFirefox) {
      return await registerSubdomainProxyFirefox(enable, hostname, port)
    }

    // At this point we would asume Chromium, but its not needed atm
    // Uncomment below if ever needed (+ add 'proxy' permission to manifest.json)
    // return await registerSubdomainProxyChromium(enable, hostname, port)
  } catch (err) {
    // registerSubdomainProxy is just a failsafe, not necessary in most cases,
    // so we should not break init when it fails.
    // For now we just log error and exit as NOOP
    log.error('registerSubdomainProxy failed', err)
    // Show pop-up only the first time, during init() when notify is passed
    try {
      if (notify) notify('notify_addonIssueTitle', 'notify_addonIssueMsg')
    } catch (_) {
    }
  }
}

// storing listener for later
var onRequestProxyListener

// registerSubdomainProxyFirefox sets proxy using API available in Firefox
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/onRequest
async function registerSubdomainProxyFirefox (enable, hostname, port) {
  const { onRequest } = browser.proxy

  // always remove the old listener (host and port could change)
  const oldListener = onRequestProxyListener
  if (oldListener && onRequest.hasListener(oldListener)) {
    onRequest.removeListener(oldListener)
  }

  if (enable) {
    // create new listener with the latest host:port note: the listener is
    // handling requests made to all localhost ports (limitation of the API,
    // port is ignored) that is why we manually check port inside of the listener
    onRequestProxyListener = (request) => {
      if (new URL(request.url).port === port) {
        return { type: 'http', host: hostname, port }
      }
      return { type: 'direct' }
    }

    // register the listener
    onRequest.addListener(onRequestProxyListener, {
      urls: ['http://*.localhost/*'],
      incognito: false
    })
    log(`enabled ${hostname}:${port} as HTTP proxy for *.localhost`)
    return
  }

  // at this point we effectively disabled proxy
  log('disabled HTTP proxy for *.localhost')
}

/*
 * Chromium 80 does not need proxy, so below is not used.
 * Uncomment below if ever needed (+ add 'proxy' permission to manifest.json)

// Helpers for converting callback chrome.* API to promises
const cb = (resolve, reject) => (result) => {
  const err = chrome.runtime.lastError
  if (err) return reject(err)
  return resolve(result)
}
const get = async (opts) => new Promise((resolve, reject) => chrome.proxy.settings.get(opts, cb(resolve, reject)))
const set = async (opts) => new Promise((resolve, reject) => chrome.proxy.settings.set(opts, cb(resolve, reject)))
const clear = async (opts) => new Promise((resolve, reject) => chrome.proxy.settings.clear(opts, cb(resolve, reject)))

// registerSubdomainProxyChromium sets proxy using API available in Chromium
// https://developer.chrome.com/extensions/proxy
async function registerSubdomainProxyChromium (enable, hostname, port) {
  const scope = 'regular_only'

  // read current proxy settings
  const settings = await get({ incognito: false })

  // set or update, if enabled
  if (enable) {
    // PAC script enables selective routing to PROXY at host+port
    // here, PROXY is the same as HTTP API endpoint
    const pacConfig = {
      mode: 'pac_script',
      pacScript: {
        data: 'function FindProxyForURL(url, host) {\n' +
                `  if (shExpMatch(host, '*.localhost:${port}'))\n` +
                `    return 'PROXY ${hostname}:${port}';\n` +
                "  return 'DIRECT';\n" +
                '}'
      }
    }
    await set({ value: pacConfig, scope })
    log(`enabled ${hostname}:${port} as HTTP proxy for *.localhost`)
    // log('updated chrome.proxy.settings', await get({ incognito: false }))
    return
  }

  // else: remove any existing proxy settings
  if (settings && settings.levelOfControl === 'controlled_by_this_extension') {
    // remove any proxy settings ipfs-companion set up before
    await clear({ scope })
    log('disabled HTTP proxy for *.localhost')
  }
}
*/

module.exports.registerSubdomainProxy = registerSubdomainProxy
