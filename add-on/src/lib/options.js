'use strict'

const isFQDN = require('is-fqdn')
const { hasChromeSocketsForTcp } = require('./runtime-checks')

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
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000,
  ipfsProxy: true // window.ipfs
})

function buildDefaultIpfsNodeType () {
  // Right now Brave is the only vendor giving us access to chrome.sockets
  return hasChromeSocketsForTcp() ? 'embedded:chromesockets' : 'external'
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
    // config.config.Addresses.API = '/ip4/127.0.0.1/tcp/5002'
    config.config.Addresses.API = '' // disable API port
    config.config.Addresses.Gateway = '/ip4/127.0.0.1/tcp/8080'
  }
  return JSON.stringify(config, null, 2)
}

// `storage` should be a browser.storage.local or similar
exports.storeMissingOptions = (read, defaults, storage) => {
  const requiredKeys = Object.keys(defaults)
  const changes = new Set()
  requiredKeys.map(key => {
    // limit work to defaults and missing values
    if (!read.hasOwnProperty(key) || read[key] === defaults[key]) {
      changes.add(new Promise((resolve, reject) => {
        storage.get(key).then(data => {
          if (!data[key]) { // detect and fix key without value in storage
            let option = {}
            option[key] = defaults[key]
            storage.set(option)
              .then(data => { resolve(`updated:${key}`) })
              .catch(error => { reject(error) })
          } else {
            resolve(`nochange:${key}`)
          }
        })
      }))
    }
  })
  return Promise.all(changes)
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
    console.log(`[ipfs-companion] migrating old dnslink policy '${dnslink}' to 'best-effort'`)
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
    console.log(`[ipfs-companion] migrating ipfsNodeType to 'embedded:chromesockets'`)
    // Overwrite old config
    const ipfsNodeConfig = JSON.parse(exports.optionDefaults.ipfsNodeConfig)
    await storage.set({
      ipfsNodeType: 'embedded:chromesockets',
      ipfsNodeConfig: JSON.stringify(ipfsNodeConfig, null, 2)
    })
  }
}
