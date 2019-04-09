'use strict'
/* eslint-env browser, webextensions */
const browser = require('webextension-polyfill')
const debug = require('debug')

// Polyfills required by embedded HTTP server
const uptimeStart = Date.now()
process.uptime = () => Math.floor((Date.now() - uptimeStart) / 1000)
process.hrtime = require('browser-process-hrtime')

const mergeOptions = require('merge-options')
const Ipfs = require('ipfs')
const HttpApi = require('ipfs/src/http')
const multiaddr = require('multiaddr')
const maToUri = require('multiaddr-to-uri')

const { optionDefaults } = require('../options')

// js-ipfs with embedded hapi HTTP server
let node = null
let nodeHttpApi = null

// additional servers for smoke-tests
// let httpServer = null
// let hapiServer = null

// Enable some debug output from js-ipfs
// (borrowed from https://github.com/ipfs-shipyard/ipfs-companion/pull/557)
// to  include everything (mplex, libp2p, mss): localStorage.debug = '*'
localStorage.debug = 'jsipfs*,ipfs*,-*:mfs*,-*:ipns*,-ipfs:preload*'

const log = debug('ipfs-companion:client:embedded')
log.error = debug('ipfs-companion:client:embedded:error')

exports.init = function init (opts) {
  /*
  // TEST RAW require('http') SERVER
  if (!httpServer) {
    httpServer = startRawHttpServer(9091)
  }
  // TEST require('hapi') HTTP SERVER (same as in js-ipfs)
  if (!hapiServer) {
    hapiServer = startRawHapiServer(9092)
  }
  */
  log('init: embedded js-ipfs+chrome.sockets')

  const defaultOpts = JSON.parse(optionDefaults.ipfsNodeConfig)
  defaultOpts.libp2p = {
    config: {
      dht: {
        enabled: false
      }
    }
  }

  const userOpts = JSON.parse(opts.ipfsNodeConfig)
  const ipfsOpts = mergeOptions.call({ concatArrays: true }, defaultOpts, userOpts, { start: false })
  log('creating js-ipfs with opts: ', ipfsOpts)
  node = new Ipfs(ipfsOpts)

  return new Promise((resolve, reject) => {
    node.once('error', (error) => {
      log.error('something went terribly wrong during startup of js-ipfs!', error)
      reject(error)
    })
    node.once('ready', async () => {
      node.on('start', async () => {
        // HttpApi is off in browser context and needs to be started separately
        try {
          const httpServers = new HttpApi(node, ipfsOpts)
          nodeHttpApi = await httpServers.start()
          await updateConfigWithHttpEndpoints(node)
          resolve(node)
        } catch (err) {
          reject(err)
        }
      })
      node.on('error', error => {
        log.error('something went terribly wrong in embedded js-ipfs!', error)
      })
      try {
        await node.start()
      } catch (err) {
        reject(err)
      }
    })
  })
}

// Update internal configuration to HTTP Endpoints from js-ipfs instance
async function updateConfigWithHttpEndpoints (ipfs) {
  const ma = await ipfs.config.get('Addresses.Gateway')
  log(`synchronizing Addresses.Gateway=${ma} to customGatewayUrl and ipfsNodeConfig`)
  const httpGateway = maToUri(ma.includes('/http') ? ma : multiaddr(ma).encapsulate('/http'))
  const ipfsNodeConfig = JSON.parse((await browser.storage.local.get('ipfsNodeConfig')).ipfsNodeConfig)
  ipfsNodeConfig.config.Addresses.Gateway = ma
  await browser.storage.local.set({
    customGatewayUrl: httpGateway,
    ipfsNodeConfig: JSON.stringify(ipfsNodeConfig, null, 2)
  })
}

exports.destroy = async function () {
  log('destroy: embedded js-ipfs+chrome.sockets')

  /*
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
  if (hapiServer) {
    try {
      await hapiServer.stop({ timeout: 1000 })
    } catch (err) {
      if (err) {
        console.error(`[ipfs-companion]  failed to stop hapi`, err)
      } else {
        console.log('[ipfs-companion] hapi server stopped')
      }
    }
    hapiServer = null
  }
  */

  if (nodeHttpApi) {
    try {
      await nodeHttpApi.stop()
    } catch (err) {
      log.error('failed to stop HttpApi', err)
    }
    nodeHttpApi = null
  }
  if (node) {
    await node.stop()
    node = null
  }
}

/*
// Quick smoke-test to confirm require('http') works for MVP
function startRawHttpServer (port) {
  const http = require('http') // courtesy of chrome-net
  const httpServer = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Hello from ipfs-companion exposing HTTP via chrome.sockets in Brave :-)\n')
  })
  httpServer.listen(port, '127.0.0.1')
  console.log(`[ipfs-companion] require('http') HTTP server on http://127.0.0.1:${port}`)
  return httpServer
}

function startRawHapiServer (port) {
  let options = {
    host: '127.0.0.1',
    port,
    debug: {
      log: ['*'],
      request: ['*']
    }
  }
  const initHapi = async () => {
    // hapi v18 (js-ipfs >=v0.35.0-pre.0)
    const Hapi = require('hapi') // courtesy of js-ipfs
    const hapiServer = new Hapi.Server(options)
    await hapiServer.route({
      method: 'GET',
      path: '/',
      handler: (request, h) => {
        console.log('[ipfs-companion] hapiServer processing request', request)
        return 'Hello from ipfs-companion+Hapi.js exposing HTTP via chrome.sockets in Brave :-)'
      }
    })
    await hapiServer.start()
    console.log(`[ipfs-companion] require('hapi') HTTP server running at: ${hapiServer.info.uri}`)
  }
  initHapi()
  return hapiServer
}
*/
