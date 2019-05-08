'use strict'

const isFQDN = require('is-fqdn')
const { hasChromeSocketsForTcp } = require('./runtime-checks')

// Detect Beta Channel on Brave via: chrome.runtime.id === 'hjoieblefckbooibpepigmacodalfndh'
// TODO: enable by default when key blockers are resolved
// - [ ] /ipns/<fqdn>/ load fine
// - [ ] sharded directories (e.g. wikipedia) load fine
const DEFAULT_TO_EMBEDDED_GATEWAY = false && hasChromeSocketsForTcp()

exports.optionDefaults = Object.freeze({
  active: true, // global ON/OFF switch, overrides everything else
  ipfsNodeType: buildDefaultIpfsNodeType(),
  ipfsNodeConfig: buildDefaultIpfsNodeConfig(),
  publicGatewayUrl: 'https://ipfs.io',
  useCustomGateway: true,
  noRedirectHostnames: [],
  automaticMode: true,
  linkify: false,
  dnslinkPolicy: 'best-effort',
  detectIpfsPathHeader: true,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  customGatewayUrl: buildCustomGatewayUrl(),
  ipfsApiUrl: buildIpfsApiUrl(),
  ipfsApiPollMs: 3000,
  ipfsProxy: true, // window.ipfs
  logNamespaces: 'jsipfs*,ipfs*,-*:ipns*,-ipfs:preload*,-ipfs-http-client:request*'
})

function buildCustomGatewayUrl () {
  // TODO: make more robust (sync with buildDefaultIpfsNodeConfig)
  const port = DEFAULT_TO_EMBEDDED_GATEWAY ? 9091 : 8080
  return `http://127.0.0.1:${port}`
}

function buildIpfsApiUrl () {
  // TODO: make more robust (sync with buildDefaultIpfsNodeConfig)
  const port = DEFAULT_TO_EMBEDDED_GATEWAY ? 5003 : 5001
  return `http://127.0.0.1:${port}`
}

function buildDefaultIpfsNodeType () {
  // Right now Brave is the only vendor giving us access to chrome.sockets
  return DEFAULT_TO_EMBEDDED_GATEWAY ? 'embedded:chromesockets' : 'external'
}

function buildDefaultIpfsNodeConfig () {
  let config = {
    config: {
      Addresses: {
        Swarm: []
      }
    }
  }
  if (hasChromeSocketsForTcp()) {
    // TODO: make more robust (sync with buildCustomGatewayUrl and buildIpfsApiUrl)
    // embedded node should use different ports to make it easier
    // for people already running regular go-ipfs and js-ipfs on standard ports
    config.config.Addresses.API = '/ip4/127.0.0.1/tcp/5003'
    config.config.Addresses.Gateway = '/ip4/127.0.0.1/tcp/9091'
    // Until we have MulticastDNS+DNS, peer discovery is done over ws-star
    config.config.Addresses.Swarm.push('/dnsaddr/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star')
    /*
      (Sidenote on why we need API for Web UI)
      Gateway can run without API port,
      but Web UI does not use window.ipfs due to sandboxing atm.

      If Web UI is able to use window.ipfs, then we can remove API port.
      Disabling API is as easy as:
      config.config.Addresses.API = ''
    */
  }
  return JSON.stringify(config, null, 2)
}

// `storage` should be a browser.storage.local or similar
exports.storeMissingOptions = async (read, defaults, storage) => {
  const requiredKeys = Object.keys(defaults)
  const changes = {}
  for (let key of requiredKeys) {
    // limit work to defaults and missing values, skip values other than defaults
    if (!read.hasOwnProperty(key) || read[key] === defaults[key]) {
      const data = await storage.get(key)
      if (!data.hasOwnProperty(key)) { // detect and fix key without value in storage
        changes[key] = defaults[key]
      }
    }
  }
  // save all in bulk
  await storage.set(changes)
  return changes
}

function normalizeGatewayURL (url) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  // https://github.com/ipfs/ipfs-companion/issues/328
  if (url.hostname.toLowerCase() === 'localhost') {
    url.hostname = '127.0.0.1'
  }
  // Return string without trailing slash
  return url.toString().replace(/\/$/, '')
}
exports.normalizeGatewayURL = normalizeGatewayURL
exports.safeURL = (url) => new URL(normalizeGatewayURL(url))

// convert JS array to multiline textarea
function hostArrayCleanup (array) {
  array = array.map(host => host.trim().toLowerCase())
  array = [...new Set(array)] // dedup
  array = array.filter(Boolean).filter(isFQDN)
  array.sort()
  return array
}
function hostArrayToText (array) {
  return hostArrayCleanup(array).join('\n')
}
function hostTextToArray (text) {
  return hostArrayCleanup(text.split('\n'))
}
exports.hostArrayToText = hostArrayToText
exports.hostTextToArray = hostTextToArray

exports.migrateOptions = async (storage) => {
  // <= v2.4.4
  // DNSLINK: convert old on/off 'dnslink' flag to text-based 'dnslinkPolicy'
  const { dnslink } = await storage.get('dnslink')
  if (dnslink) {
    // migrating old dnslink policy to 'best-effort'
    await storage.set({
      dnslinkPolicy: 'best-effort',
      detectIpfsPathHeader: true
    })
    await storage.remove('dnslink')
  }
  // ~ v2.8.x + Brave
  // Upgrade js-ipfs to js-ipfs + chrome.sockets
  const { ipfsNodeType } = await storage.get('ipfsNodeType')
  if (ipfsNodeType === 'embedded' && hasChromeSocketsForTcp()) {
    // migrating ipfsNodeType to embedded:chromesockets
    await storage.set({
      ipfsNodeType: 'embedded:chromesockets',
      ipfsNodeConfig: buildDefaultIpfsNodeConfig()
    })
  }
}
