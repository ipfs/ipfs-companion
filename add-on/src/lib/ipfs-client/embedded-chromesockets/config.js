'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')

const { optionDefaults } = require('../../options')
const chromeSocketsBundle = require('./libp2p-bundle')
const mergeOptions = require('merge-options')
const getPort = require('get-port')

const multiaddr = require('multiaddr')
const maToUri = require('multiaddr-to-uri')
const multiaddr2httpUrl = (ma) => maToUri(ma.includes('/http') ? ma : multiaddr(ma).encapsulate('/http'))

const chromeSocketsOpts = {
  config: {
    Addresses: {
      API: '/ip4/127.0.0.1/tcp/5003',
      Gateway: '/ip4/127.0.0.1/tcp/9091',
      /* Sidenote on API & Gateway:
         Gateway can run without API port,
         but Web UI needs API (can't use window.ipfs due to sandboxing)
      */
      Swarm: [
        // TODO: listening on TCP (override IP and port at runtime in buildConfig()?)
        '/ip4/0.0.0.0/tcp/0',
        // optional ws-star signaling provides a backup non-LAN peer discovery
        '/dns4/ws-star1.par.dwebops.pub.com/tcp/443/wss/p2p-websocket-star'
      ],
      // Delegated Content and Peer Routing: https://github.com/ipfs/js-ipfs/pull/2195
      Delegates: // [] // TODO: enable delegates
      [
        '/dns4/node1.delegate.ipfs.io/tcp/443/https',
        '/dns4/node0.delegate.ipfs.io/tcp/443/https'
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
        LowWater: 100,
        HighWater: 250
      }
    },
    Bootstrap: [
      // Prioritize TCP Bootstrappers from https://github.com/ipfs/js-ipfs/blob/v0.37.1/src/core/runtime/config-nodejs.js#L22
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
    ]
  },
  // preload: { enabled: false, addresses: [] }
  /* TODO: when we have p2p transport, are preloads still needed? should Brave have own nodes? */
  preload: {
    enabled: true,
    addresses: [
      '/dns4/node1.preload.ipfs.io/tcp/443/https',
      '/dns4/node0.preload.ipfs.io/tcp/443/https'
    ]
  }
}

async function buildConfig (opts, log) {
  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const ipfsNodeConfig = mergeOptions(defaultOpts, userOpts, chromeSocketsOpts, { start: false, libp2p: chromeSocketsBundle })

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

async function syncConfig (ipfs, opts, log) {
  const localConfig = await browser.storage.local.get('ipfsNodeConfig')
  if (localConfig && localConfig.ipfsNodeConfig) {
    const gwMa = await ipfs.config.get('Addresses.Gateway')
    const apiMa = await ipfs.config.get('Addresses.API')
    const httpGateway = multiaddr2httpUrl(gwMa)
    const httpApi = multiaddr2httpUrl(apiMa)
    // update config in browser.storage to ports from js-ipfs instance
    const ipfsNodeConfig = JSON.parse(localConfig.ipfsNodeConfig)
    ipfsNodeConfig.config.Addresses.Gateway = gwMa
    ipfsNodeConfig.config.Addresses.API = apiMa
    const configChanges = {
      customGatewayUrl: httpGateway,
      ipfsApiUrl: httpApi,
      ipfsNodeConfig: JSON.stringify(ipfsNodeConfig, null, 2)
    }
    // update runtime config in place
    Object.assign(opts, configChanges)
    // update config in browser.storage (triggers async client restart if ports changed)
    log(`synchronizing ipfsNodeConfig with customGatewayUrl (${configChanges.customGatewayUrl}) and ipfsApiUrl (${configChanges.ipfsApiUrl})`)
    await browser.storage.local.set(configChanges)
  }
}

module.exports = { buildConfig, syncConfig }
