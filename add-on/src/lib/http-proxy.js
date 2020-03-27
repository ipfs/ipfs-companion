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
// More: https://docs-beta.ipfs.io/how-to/address-ipfs-on-web/#subdomain-gateway
//
// In a web browser contexts we care about Origin per content root (CID)
// because entire web security model uses it as a basis for sandboxing and
// access controls:
// https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy

// registerSubdomainProxy is necessary wourkaround for supporting subdomains
// under 'localhost' (*.ipfs.localhost) because some operating systems do not
// resolve them to local IP and return NX error not found instead
async function registerSubdomainProxy (getState, runtime) {
  const { useSubdomainProxy: enable, gwURLString } = getState()

  // HTTP Proxy feature is exposed on the gateway port
  // Just ensure we use localhost IP to remove any dependency on DNS
  const proxy = safeURL(gwURLString, { useLocalhostName: false })

  // Firefox uses own APIs for selective proxying
  if (runtime.isFirefox) {
    return registerSubdomainProxyFirefox(enable, proxy.hostname, proxy.port)
  }

  // at this point we asume Chromium
  return registerSubdomainProxyChromium(enable, proxy.host)
}

// storing listener for later
var onRequestProxyListener

// registerSubdomainProxyFirefox sets proxy using API available in Firefox
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/onRequest
async function registerSubdomainProxyFirefox (enable, host, port) {
  const { onRequest } = browser.proxy

  // always remove the old listener (host and port could change)
  const oldListener = onRequestProxyListener
  if (oldListener && onRequest.hasListener(oldListener)) {
    onRequest.removeListener(oldListener)
  }

  if (enable) {
    // create new listener with the latest host:port
    onRequestProxyListener = (request) => ({ type: 'http', host, port })

    // register the listener
    onRequest.addListener(onRequestProxyListener, {
      urls: ['http://*.localhost/*'],
      incognito: false
    })
    log(`enabled ${host}:${port} as HTTP proxy for *.localhost`)
    return
  }

  // at this point we effectively disabled proxy
  log('disabled HTTP proxy for *.localhost')
}

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
async function registerSubdomainProxyChromium (enable, proxyHost) {
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
                "  if (shExpMatch(host, '*.localhost'))\n" +
                `    return 'PROXY ${proxyHost}';\n` +
                "  return 'DIRECT';\n" +
                '}'
      }
    }
    await set({ value: pacConfig, scope })
    log(`enabled ${proxyHost} as HTTP proxy for *.localhost`)
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

module.exports.registerSubdomainProxy = registerSubdomainProxy
