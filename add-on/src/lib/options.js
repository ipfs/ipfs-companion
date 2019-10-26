'use strict'

const isFQDN = require('is-fqdn')
const { hasChromeSocketsForTcp } = require('./runtime-checks')

// TODO: enable by default when embedded node is performant enough
const DEFAULT_TO_EMBEDDED_GATEWAY = false && hasChromeSocketsForTcp()

exports.optionDefaults = Object.freeze({
  active: true, // global ON/OFF switch, overrides everything else
  ipfsNodeType: buildDefaultIpfsNodeType(),
  ipfsNodeConfig: buildDefaultIpfsNodeConfig(),
  publicGatewayUrl: 'https://ipfs.io',
  publicSubdomainGatewayUrl: 'https://dweb.link',
  useCustomGateway: true,
  noRedirectHostnames: [],
  automaticMode: true,
  linkify: false,
  dnslinkPolicy: 'best-effort',
  recoverFailedHttpRequests: true,
  detectIpfsPathHeader: true,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  customGatewayUrl: buildCustomGatewayUrl(),
  ipfsApiUrl: buildIpfsApiUrl(),
  ipfsApiPollMs: 3000,
  ipfsProxy: true, // window.ipfs
  logNamespaces: 'jsipfs*,ipfs*,libp2p:mdns*,libp2p-delegated*,-*:ipns*,-ipfs:preload*,-ipfs-http-client:request*,-ipfs:http-api*'
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
  return JSON.stringify({
    config: {
      Addresses: {
        Swarm: []
      }
    }
  }, null, 2)
}

// `storage` should be a browser.storage.local or similar
exports.storeMissingOptions = async (read, defaults, storage) => {
  const requiredKeys = Object.keys(defaults)
  const changes = {}
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)
  for (const key of requiredKeys) {
    // limit work to defaults and missing values, skip values other than defaults
    if (!has(read, key) || read[key] === defaults[key]) {
      const data = await storage.get(key)
      if (!has(data, key)) { // detect and fix key without value in storage
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
