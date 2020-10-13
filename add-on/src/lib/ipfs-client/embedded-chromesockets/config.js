'use strict'

const browser = require('webextension-polyfill')

const { optionDefaults } = require('../../options')
const mergeOptions = require('merge-options')
const getPort = require('get-port')
const { getIPv4, getIPv6 } = require('webrtc-ips')

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MulticastDNS = require('libp2p-mdns')

const multiaddr = require('multiaddr')
const maToUri = require('multiaddr-to-uri')
const multiaddr2httpUrl = (ma) => maToUri(ma.includes('/http') ? ma : multiaddr(ma).encapsulate('/http'))

const debug = require('debug')
const log = debug('ipfs-companion:client:embedded:config')
log.error = debug('ipfs-companion:client:embedded:config:error')

// additional default js-ipfs config specific to runtime with chrome.sockets APIs
const chromeDefaultOpts = {
  config: {
    Addresses: {
      API: '/ip4/127.0.0.1/tcp/5003',
      Gateway: '/ip4/127.0.0.1/tcp/9091',
      /* Sidenote on API & Gateway:
         Gateway can run without API port,
         but Web UI needs API (can't use window.ipfs due to sandboxing)
      */
      Swarm: [
        // additional signaling service provides a backup for non-LAN peer discovery
        // (this will be removed when autorelay and DHT are stable in js-ipfs)
        '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
      ],
      // Delegated Content and Peer Routing: https://github.com/ipfs/js-ipfs/pull/2195
      Delegates: [
        '/dns4/node0.delegate.ipfs.io/tcp/443/https',
        '/dns4/node1.delegate.ipfs.io/tcp/443/https',
        '/dns4/node2.delegate.ipfs.io/tcp/443/https',
        '/dns4/node3.delegate.ipfs.io/tcp/443/https'
      ]
    },
    Discovery: {
      MDNS: {
        Enabled: true,
        Interval: 10
      }
    },
    Swarm: {
      ConnMgr: {
        LowWater: 50,
        HighWater: 200
      }
    },
    Bootstrap: [
      // Prioritize TCP Bootstrappers from https://github.com/ipfs/js-ipfs/blob/ipfs%400.50.2/packages/ipfs/src/core/runtime/config-nodejs.js
      '/ip4/104.236.176.52/tcp/4001/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
      '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
      '/ip4/104.236.179.241/tcp/4001/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
      '/ip4/162.243.248.213/tcp/4001/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
      '/ip4/128.199.219.111/tcp/4001/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
      '/ip4/104.236.76.40/tcp/4001/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
      '/ip4/178.62.158.247/tcp/4001/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
      '/ip4/178.62.61.185/tcp/4001/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
      '/ip4/104.236.151.122/tcp/4001/p2p/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
      '/ip6/2604:a880:1:20::1f9:9001/tcp/4001/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
      '/ip6/2604:a880:1:20::203:d001/tcp/4001/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
      '/ip6/2604:a880:0:1010::23:d001/tcp/4001/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
      '/ip6/2400:6180:0:d0::151:6001/tcp/4001/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
      '/ip6/2604:a880:800:10::4a:5001/tcp/4001/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
      '/ip6/2a03:b0c0:0:1010::23:1001/tcp/4001/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
      '/ip6/2a03:b0c0:1:d0::e7:1/tcp/4001/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
      '/ip6/2604:a880:1:20::1d9:6001/tcp/4001/p2p/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
      '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
      '/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
      '/dns4/node2.preload.ipfs.io/tcp/443/wss/p2p/QmV7gnbW5VTcJ3oyM2Xk1rdFBJ3kTkvxc87UFGsun29STS',
      '/dns4/node3.preload.ipfs.io/tcp/443/wss/p2p/QmY7JB6MQXhxHvq7dBDh4HpbH29v4yE9JRadAVpndvzySN',
      // WebSockets versions from https://github.com/ipfs/js-ipfs/blob/ipfs%400.50.2/packages/ipfs/src/core/runtime/config-browser.js
      '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
      '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
      '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
      '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
      '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
      '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64'
    ]
  },
  preload: {
    enabled: true,
    addresses: [
      '/dns4/node3.preload.ipfs.io/tcp/443/https',
      '/dns4/node2.preload.ipfs.io/tcp/443/https',
      '/dns4/node1.preload.ipfs.io/tcp/443/https',
      '/dns4/node0.preload.ipfs.io/tcp/443/https'
    ]
  }
}

async function buildConfig (opts, log) {
  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const chromeOpts = JSON.parse(JSON.stringify(chromeDefaultOpts))

  // find a free TCP port for incoming connections
  const freeTcpPort = await getPort({ port: getPort.makeRange(4042, 4100) })
  // find out local network IPs
  const ipv4 = await getIPv4()
  const ipv6 = await getIPv6()
  // add TCP multiaddrs
  if (ipv4) {
    chromeOpts.config.Addresses.Swarm.unshift(`/ip4/${ipv4}/tcp/${freeTcpPort}`)
  }
  if (ipv6) {
    chromeOpts.config.Addresses.Swarm.unshift(`/ip6/${ipv6}/tcp/${freeTcpPort}`)
  }
  // append user-provided multiaddrs
  chromeOpts.config.Addresses.Swarm = chromeOpts.config.Addresses.Swarm.concat(userOpts.config.Addresses.Swarm)

  // merge configs
  const finalOpts = {
    start: false,
    // a function that customizes libp2p config: https://github.com/ipfs/js-ipfs/pull/2591
    libp2p: ({ libp2pOptions, peerInfo }) => {
      libp2pOptions.modules = mergeOptions.call({ concatArrays: true }, libp2pOptions.modules, {
        transports: [TCP]
      })

      libp2pOptions.modules = mergeOptions.call({ concatArrays: true }, libp2pOptions.modules, {
        peerDiscovery: [MulticastDNS]
      })

      libp2pOptions.config = mergeOptions(libp2pOptions.config, {
        peerDiscovery: {
          autoDial: true,
          mdns: {
            enabled: true
          },
          bootstrap: {
            enabled: true
          },
          webRTCStar: {
            enabled: true
          },
          dht: {
            kBucketSize: 20,
            enabled: false,
            clientMode: true,
            randomWalk: {
              enabled: false
            }
          },
          pubsub: {
            enabled: true,
            emitSelf: true
          }
        }
      })

      libp2pOptions.dialer = {
        // https://github.com/ipfs/js-ipfs/blob/ipfs%400.49.0/packages/ipfs/src/core/runtime/libp2p-browser.js#L14
        maxParallelDials: 150, // 150 total parallel multiaddr dials
        maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
        dialTimeout: 10e3 // 10 second dial timeout per peer dial
      }

      log('initializing libp2p with libp2pOptions', libp2pOptions)
      return new Libp2p(libp2pOptions)
    }
  }
  const ipfsNodeConfig = mergeOptions(defaultOpts, userOpts, chromeOpts, finalOpts)

  // Detect when API or Gateway port is not available (taken by something else)
  // We find the next free port and update configuration to use it instead
  const multiaddr2port = (ma) => parseInt(new URL(multiaddr2httpUrl(ma)).port, 10)
  const gatewayPort = multiaddr2port(ipfsNodeConfig.config.Addresses.Gateway)
  const apiPort = multiaddr2port(ipfsNodeConfig.config.Addresses.API)
  log(`checking if ports are available: api: ${apiPort}, gateway: ${gatewayPort}`)
  const freeGatewayPort = await getPort({ port: getPort.makeRange(gatewayPort, gatewayPort + 100) })
  const freeApiPort = await getPort({ port: getPort.makeRange(apiPort, apiPort + 100) })
  if (gatewayPort !== freeGatewayPort || apiPort !== freeApiPort) {
    log(`updating config to available ports: api: ${freeApiPort}, gateway: ${freeGatewayPort}`)
    const addrs = ipfsNodeConfig.config.Addresses
    addrs.Gateway = addrs.Gateway.replace(gatewayPort.toString(), freeGatewayPort.toString())
    addrs.API = addrs.API.replace(apiPort.toString(), freeApiPort.toString())
  }

  return ipfsNodeConfig
}

async function syncConfig (liveConfig, log) {
  const storedConfig = await browser.storage.local.get('ipfsNodeConfig')
  if (storedConfig && storedConfig.ipfsNodeConfig) {
    const maGw = liveConfig.config.Addresses.Gateway
    const maApi = liveConfig.config.Addresses.API
    const httpGw = multiaddr2httpUrl(maGw)
    const httpApi = multiaddr2httpUrl(maApi)
    // update config in browser.storage to ports from js-ipfs instance
    const changes = {
      customGatewayUrl: httpGw,
      ipfsApiUrl: httpApi
    }
    // update ipfsNodeConfig if ports changed (eg. due to old port being busy)
    const cfg = JSON.parse(storedConfig.ipfsNodeConfig)
    if (maGw !== cfg.config.Addresses.Gateway ||
       maApi !== cfg.config.Addresses.API) {
      cfg.config.Addresses.Gateway = maGw
      cfg.config.Addresses.API = maApi
      changes.ipfsNodeConfig = JSON.stringify(cfg, null, 2)
      // update runtime config in place
      Object.assign(liveConfig, changes)
      // save config to browser.storage (triggers async client restart if ports changed)
      log(`synchronizing ipfsNodeConfig with customGatewayUrl (${changes.customGatewayUrl}) and ipfsApiUrl (${changes.ipfsApiUrl})`)
      await browser.storage.local.set(changes)
      log('reloading extension due to TCP port config change')
      browser.tabs.reload() // async reload of options page to keep it alive
      await browser.runtime.reload()
    }
  }
}

module.exports = { buildConfig, syncConfig }
