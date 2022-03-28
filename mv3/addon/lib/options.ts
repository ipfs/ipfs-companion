'use strict'

import { isIPv4, isIPv6 } from 'is-ip';
import { isFQDN } from 'is-fqdn'

export const optionDefaults = Object.freeze({
  active: true, // global ON/OFF switch, overrides everything else
  publicGatewayUrl: 'https://ipfs.io',
  publicSubdomainGatewayUrl: 'https://dweb.link',
  // recoverFailedHttpRequests: true,
  // detectIpfsPathHeader: true,
  displayNotifications: true,
  displayReleaseNotes: false,
  customGatewayUrl: 'http://localhost:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000,
  logNamespaces: 'jsipfs*,ipfs*,libp2p:mdns*,libp2p-delegated*,-*:ipns*,-ipfs:preload*,-ipfs-http-client:request*,-ipfs:http-api*',
  importDir: '/ipfs-companion-imports/%Y-%M-%D_%h%m%s/',
  dismissedUpdate: null,
  openViaWebUI: true
})

// `storage` should be a browser.storage.local or similar
export async function storeMissingOptions (read, defaults, storage) {
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

// safeURL produces URL object with optional normalizations
export function safeURL (url, opts) {
  opts = opts || { useLocalhostName: true }
  if (typeof url === 'string') {
    url = new URL(url)
  }
  if (url.hostname === '0.0.0.0') {
    // normalize 0.0.0.0 (used by go-ipfs in the console)
    // to 127.0.0.1 to minimize the number of edge cases we need to handle later
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/867
    url = new URL(url.toString())
    url.hostname = '127.0.0.1'
  }
  // "localhost" gateway normalization matters because:
  // - 127.0.0.1 is a path gateway
  // - localhost is a subdomain gateway
  // https://github.com/ipfs-shipyard/ipfs-companion/issues/328#issuecomment-537383212
  if (opts.useLocalhostName && localhostIpUrl(url)) {
    url.hostname = 'localhost'
  }
  if (!opts.useLocalhostName && localhostNameUrl(url)) {
    url.hostname = '127.0.0.1'
  }
  return url
}

// Return string without trailing slash
export function guiURLString (url, opts) {
  return safeURL(url, opts).toString().replace(/\/$/, '')
}

// ensure value is a valid URL.hostname (FQDN || ipv4 || ipv6 WITH brackets)
export function isHostname (x) {
  if (isFQDN(x) || isIPv4(x)) {
    return true
  }

  const match = x.match(/^\[(.*)\]$/)

  if (match == null) {
    return false
  }

  return isIPv6(match[1])
}

// convert JS array to multiline textarea
function hostArrayCleanup (array) {
  array = array.map(host => host.trim().toLowerCase())
  // normalize/extract hostnames (just domain/ip, drop ports etc), if provided
  array = array.map(x => {
    try {
      if (isIPv6(x)) x = `[${x}]`
      return new URL(`http://${x}`).hostname
    } catch (_) {
      return undefined
    }
  })
  array = array.filter(Boolean).filter(exports.isHostname)
  array = [...new Set(array)] // dedup
  array.sort()
  return array
}
export function hostArrayToText (array) {
  return hostArrayCleanup(array).join('\n')
}
export function hostTextToArray (text) {
  return hostArrayCleanup(text.split('\n'))
}

function localhostIpUrl (url) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  return url.hostname === '127.0.0.1' || url.hostname === '[::1]'
}
function localhostNameUrl (url) {
  if (typeof url === 'string') {
    url = new URL(url)
  }
  return url.hostname.toLowerCase() === 'localhost'
}
