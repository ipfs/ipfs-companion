'use strict'

const isIP = require('is-ip')
const isFQDN = require('is-fqdn')

exports.optionDefaults = Object.freeze({
  active: true, // global ON/OFF switch, overrides everything else
  ipfsNodeType: 'external',
  ipfsNodeConfig: buildDefaultIpfsNodeConfig(),
  publicGatewayUrl: 'https://ipfs.io',
  publicSubdomainGatewayUrl: 'https://dweb.link',
  useCustomGateway: true,
  useSubdomains: true,
  enabledOn: [], // hostnames with explicit integration opt-in
  disabledOn: [], // hostnames with explicit integration opt-out
  automaticMode: true,
  linkify: false,
  dnslinkPolicy: 'best-effort',
  dnslinkDataPreload: true,
  dnslinkRedirect: true,
  recoverFailedHttpRequests: true,
  detectIpfsPathHeader: true,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  displayReleaseNotes: false,
  customGatewayUrl: 'http://localhost:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000,
  ipfsProxy: true, // window.ipfs
  logNamespaces: 'jsipfs*,ipfs*,libp2p:mdns*,libp2p-delegated*,-*:ipns*,-ipfs:preload*,-ipfs-http-client:request*,-ipfs:http-api*',
  importDir: '/ipfs-companion-imports/%Y-%M-%D_%h%m%s/',
  useLatestWebUI: false,
  dismissedUpdate: null,
  openViaWebUI: true
})

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

// safeURL produces URL object with optional normalizations
function safeURL (url, opts) {
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
function guiURLString (url, opts) {
  return safeURL(url, opts).toString().replace(/\/$/, '')
}
exports.safeURL = safeURL
exports.guiURLString = guiURLString

// ensure value is a valid URL.hostname (FQDN || ipv4 || ipv6 WITH brackets)
exports.isHostname = x => {
  if (isFQDN(x) || isIP.v4(x)) {
    return true
  }

  const match = x.match(/^\[(.*)\]$/)

  if (match == null) {
    return false
  }

  return isIP.v6(match[1])
}

// convert JS array to multiline textarea
function hostArrayCleanup (array) {
  array = array.map(host => host.trim().toLowerCase())
  // normalize/extract hostnames (just domain/ip, drop ports etc), if provided
  array = array.map(x => {
    try {
      if (isIP.v6(x)) x = `[${x}]`
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
function hostArrayToText (array) {
  return hostArrayCleanup(array).join('\n')
}
function hostTextToArray (text) {
  return hostArrayCleanup(text.split('\n'))
}
exports.hostArrayToText = hostArrayToText
exports.hostTextToArray = hostTextToArray

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

exports.migrateOptions = async (storage, debug) => {
  const log = debug('ipfs-companion:migrations')
  log.error = debug('ipfs-companion:migrations:error')

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

  // ~ v2.9.x: migrating noRedirectHostnames → noIntegrationsHostnames
  // https://github.com/ipfs-shipyard/ipfs-companion/pull/830
  const { noRedirectHostnames } = await storage.get('noRedirectHostnames')
  if (noRedirectHostnames) {
    await storage.set({ noIntegrationsHostnames: noRedirectHostnames })
    await storage.remove('noRedirectHostnames')
  }

  // ~v2.11: subdomain proxy at *.ipfs.localhost
  // migrate old default 127.0.0.1 to localhost hostname
  const { customGatewayUrl: gwUrl } = await storage.get('customGatewayUrl')
  if (gwUrl && (localhostIpUrl(gwUrl) || localhostNameUrl(gwUrl))) {
    const { useSubdomains } = await storage.get('useSubdomains')
    const newUrl = guiURLString(gwUrl, { useLocalhostName: useSubdomains })
    if (gwUrl !== newUrl) {
      await storage.set({ customGatewayUrl: newUrl })
    }
  }

  { // ~v2.15.x: migrating noIntregrationsHostnames → disabledOn
    const { disabledOn, noIntegrationsHostnames } = await storage.get(['disabledOn', 'noIntegrationsHostnames'])
    if (noIntegrationsHostnames) {
      log('migrating noIntregrationsHostnames → disabledOn')
      await storage.set({ disabledOn: disabledOn.concat(noIntegrationsHostnames) })
      await storage.remove('noIntegrationsHostnames')
    }
  }

  { // ~v2.15.x: opt-out some hostnames if user does not have excplicit rule already
    const { enabledOn, disabledOn } = await storage.get(['enabledOn', 'disabledOn'])
    for (const fqdn of [
      'proto.school', //  https://github.com/ipfs-shipyard/ipfs-companion/issues/921
      'app.fleek.co' // https://github.com/ipfs-shipyard/ipfs-companion/pull/929#pullrequestreview-509501401
    ]) {
      if (enabledOn.includes(fqdn) || disabledOn.includes(fqdn)) continue
      log(`adding '${fqdn}' to 'disabledOn' list`)
      disabledOn.push(fqdn)
      await storage.set({ disabledOn })
    }
  }

  { // ~v2.15.1: change displayReleaseNotes opt-out flag to opt-in
    const { displayReleaseNotes, dismissedUpdate } = await storage.get(['displayReleaseNotes', 'dismissedUpdate'])
    if (!dismissedUpdate && displayReleaseNotes) {
      log('converting displayReleaseNotes from out-out to opt-in')
      await storage.set({ displayReleaseNotes: false })
    }
  }

  // TODO: refactor this, so migrations only run once (like https://github.com/sindresorhus/electron-store#migrations)
}
