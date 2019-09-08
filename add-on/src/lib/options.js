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
  logNamespaces: 'jsipfs*,ipfs*,libp2p:mdns*,libp2p-delegated*,-*:ipns*,-ipfs:preload*,-ipfs-http-client:request*'
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
  const config = {
    config: {
      Addresses: {
        Swarm: []
      },
      Bootstrap: [
        // TCP Bootstrappers from https://github.com/ipfs/js-ipfs/blob/v0.37.1/src/core/runtime/config-nodejs.js#L22
        '/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
        '/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        '/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
        '/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
        '/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
        '/ip4/104.236.76.40/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
        '/ip4/178.62.158.247/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
        '/ip4/178.62.61.185/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
        '/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
        '/ip6/2604:a880:1:20::1f9:9001/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
        '/ip6/2604:a880:1:20::203:d001/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
        '/ip6/2604:a880:0:1010::23:d001/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
        '/ip6/2400:6180:0:d0::151:6001/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
        '/ip6/2604:a880:800:10::4a:5001/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
        '/ip6/2a03:b0c0:0:1010::23:1001/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
        '/ip6/2a03:b0c0:1:d0::e7:1/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
        '/ip6/2604:a880:1:20::1d9:6001/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
        // Twist: connect to preload nodes, but over tcp :)
        '/dns4/node0.preload.ipfs.io/tcp/4001/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
        '/dns4/node1.preload.ipfs.io/tcp/4001/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
        // WebSockets versions from https://github.com/ipfs/js-ipfs/blob/v0.37.1/src/core/runtime/config-browser.js#L20
        '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
        '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
        '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
        '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
        '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
        '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
        '/dns4/node0.preload.ipfs.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
        '/dns4/node1.preload.ipfs.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
      ],
      Swarm: {
        ConnMgr: {
          LowWater: 100,
          HighWater: 250
        }
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
    config.config.Addresses.Swarm = [
      '/ip4/0.0.0.0/tcp/0',
      '/dns4/ws-star1.par.dwebops.pub/tcp/443/wss/p2p-websocket-star'
      // '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
    ]
    /*
    // Until DHT and p2p transport are ready, delegate + preload
    // Note: we use .preload.ipfs.io and .delegate.ipfs.io as means of http sharding (12 instead of 6 concurrent requests)
    const delegates = [
      '/dns4/node1.delegate.ipfs.io/tcp/443/https',
      '/dns4/node0.delegate.ipfs.io/tcp/443/https'
    ]
    // Delegated Content and Peer Routing: https://github.com/ipfs/js-ipfs/pull/2195
    config.config.Addresses.Delegates = delegates
    // TODO: when we have p2p transport, are preloads still needed? should Brave have own nodes?
    config.preload = {
      enabled: true,
      addresses: [
        '/dns4/node1.preload.ipfs.io/tcp/443/https',
        '/dns4/node0.preload.ipfs.io/tcp/443/https'
      ]
    }
    */
    config.preload = { enabled: false }
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
