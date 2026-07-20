'use strict'

import isFQDN from 'is-fqdn'
import { isIPv4, isIPv6 } from 'is-ip'
import { POSSIBLE_NODE_TYPES } from './state.js'

// Public gateways prefilled on a fresh install; "Copy Shareable Link" builds
// links on the subdomain one. Clearing a gateway URL in Preferences opts out
// of it (shareable links then fall back to native ipfs:// and ipns:// URIs).
// To ship native sharing by default, flip
// DEFAULT_USE_PUBLIC_GATEWAYS_FOR_SHARE to false and set both gateway
// constants to ''; everything else already copes with unset gateways.
// Note: storeMissingOptions persists these values into every profile, so
// flipping the constants alone only changes fresh installs. To reach existing
// profiles, the flip also needs a migrateOptions entry that rewrites stored
// values still equal to the constants below (users who changed them keep
// their choice).
export const DEFAULT_PUBLIC_GATEWAY_URL = 'https://ipfs.io'
export const DEFAULT_PUBLIC_SUBDOMAIN_GATEWAY_URL = 'https://dweb.link'
export const DEFAULT_USE_PUBLIC_GATEWAYS_FOR_SHARE = true

/**
 * @type {Readonly<import('../types/companion.js').CompanionOptions>}
 */
export const optionDefaults = Object.freeze({
  active: true, // global ON/OFF switch, overrides everything else
  ipfsNodeType: 'external',
  ipfsNodeConfig: buildDefaultIpfsNodeConfig(),
  publicGatewayUrl: DEFAULT_PUBLIC_GATEWAY_URL,
  publicSubdomainGatewayUrl: DEFAULT_PUBLIC_SUBDOMAIN_GATEWAY_URL,
  // When on, "Copy Shareable Link" copies a URL at one of the public gateways
  // above (subdomain preferred); when off, or when no public gateway URL is
  // set, it copies native ipfs:// and ipns:// URIs.
  usePublicGatewaysForShare: DEFAULT_USE_PUBLIC_GATEWAYS_FOR_SHARE,
  useCustomGateway: true,
  useSubdomains: true,
  // When off (default), only top-level document navigations are redirected to
  // the local gateway. Redirecting embedded subresources shares the gateway
  // origin across unrelated sites (a super-cookie vector) and triggers Chrome
  // Local Network Access prompts, so it is opt-in.
  redirectSubresources: false,
  enabledOn: [], // hostnames with explicit integration opt-in
  disabledOn: [], // hostnames with explicit integration opt-out
  automaticMode: true,
  linkify: false,
  // DNSLink is two toggles: dnslinkLookup checks each visited domain for a
  // DNSLink record (so we know which sites are IPFS-hosted, for browser-action
  // items and as a prerequisite for redirect); dnslinkRedirect then loads those
  // sites from the local gateway. Redirect does nothing without lookup.
  dnslinkLookup: true,
  dnslinkRedirect: true,
  recoverFailedHttpRequests: true,
  // legacy opt-in, off by default: when a site sends the x-ipfs-path response
  // header, redirect to the exact /ipfs/ path it carries. Unsafe: a site with
  // this header but no DNSLink is misconfigured hosting and the redirect
  // strands the user on an immutable snapshot (#1052). DNSLink sites are
  // upgraded without this; kept only as an escape hatch. A fresh key (renamed
  // from detectIpfsPathHeader) so every existing profile also starts off.
  redirectToXIpfsPathValue: false,
  // When on (default), a URL carrying the ?x-ipfs-companion-no-redirect query
  // parameter is left on its original destination instead of being redirected
  // to the local gateway. Under MV3 this installs a declarativeNetRequest allow
  // rule; turning it off removes that rule and disables the opt-out.
  honorRedirectOptOutHint: true,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  displayReleaseNotes: false,
  customGatewayUrl: 'http://localhost:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000,
  logNamespaces: '',
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

// Return string without trailing slash (empty input stays empty, so optional
// gateway URLs can be cleared)
export function guiURLString (url, opts) {
  if (!url) return ''
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
  array = array.filter(Boolean).filter(isHostname)
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

export async function migrateOptions (storage, debug) {
  const log = debug('ipfs-companion:migrations')
  log.error = debug('ipfs-companion:migrations:error')

  // <= v2.4.4
  // DNSLINK: convert the ancient on/off 'dnslink' flag to the DNSLink toggles
  const { dnslink } = await storage.get('dnslink')
  if (dnslink) {
    await storage.set({ dnslinkLookup: true, dnslinkRedirect: true })
    await storage.remove('dnslink')
  }

  // dnslinkPolicy (off | best-effort | enabled) becomes the boolean dnslinkLookup
  // (on unless it was off); dnslinkRedirect keeps its own stored value. The
  // preload experiment (dnslinkDataPreload) is removed.
  {
    const { dnslinkPolicy } = await storage.get('dnslinkPolicy')
    if (dnslinkPolicy !== undefined) {
      log('migrating dnslinkPolicy to dnslinkLookup')
      await storage.set({ dnslinkLookup: String(dnslinkPolicy) !== 'false' })
      await storage.remove(['dnslinkPolicy', 'dnslinkDataPreload'])
    }
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

  // ~v2.15.x: opt-out some hostnames if user does not have excplicit rule already
  // Commented out - no longer adding default items to disabledOn
  /*
  {
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
  */

  { // ~v2.15.1: change displayReleaseNotes opt-out flag to opt-in
    const { displayReleaseNotes, dismissedUpdate } = await storage.get(['displayReleaseNotes', 'dismissedUpdate'])
    if (!dismissedUpdate && displayReleaseNotes) {
      log('converting displayReleaseNotes from out-out to opt-in')
      await storage.set({ displayReleaseNotes: false })
    }
  }

  {
    // -v3.0.0: migrate ipfsNodeType to 'external' (if missing)
    const { ipfsNodeType } = await storage.get(['ipfsNodeType'])
    if (!POSSIBLE_NODE_TYPES.includes(ipfsNodeType)) {
      log('migrating ipfsNodeType to "external"')
      await storage.set({ ipfsNodeType: 'external' })
    }
  }

  // TODO: refactor this, so migrations only run once (like https://github.com/sindresorhus/electron-store#migrations)
}
