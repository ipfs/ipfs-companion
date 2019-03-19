'use strict'
/* eslint-env browser, webextensions */

// Required by HTTP server
process.hrtime = require('browser-process-hrtime')
const uptimeStart = Date.now()
process.uptime = () => Math.floor((Date.now() - uptimeStart) / 1000)

const Ipfs = require('ipfs')
const HttpApi = require('ipfs/src/http')

const { optionDefaults } = require('../options')

// js-ipfs with embedded hapi HTTP server
let node = null
let nodeHttpApi = null

// additional servers for smoke-tests
let httpServer = null
let hapiServer = null

// Enable some debug output from js-ipfs
// (borrowed from https://github.com/ipfs-shipyard/ipfs-companion/pull/557)
// to  include everything (mplex, libp2p, mss): localStorage.debug = '*'
localStorage.debug = 'jsipfs*,ipfs*,-*:mfs*,-*:ipns*,-ipfs:preload*'

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

exports.init = function init (opts) {
  // BRAVE TESTS FIRST
  // TODO: remove after experiments are done
  // =======================================
  // [x] start raw http server (http.createServer)
  // [x] start raw Hapi server (Hapi.Server)
  //     [x] return response
  // [ ] start js-ipfs with Gateway exposed by embedded Hapi server
  //     - [x] disabling DHT in libp2p solved `TypeError: this._dht.on is not a function`,
  //     - [x] API port starts and returns valid response
  //     - [ ] Gateway port starts, but returns invalid response for things different than QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn
  // =======================================
  // TEST RAW require('http') SERVER
  if (!httpServer) {
    httpServer = startRawHttpServer(9091)
  }
  // =======================================
  // TEST require('hapi') HTTP SERVER (same as in js-ipfs)
  if (!hapiServer) {
    hapiServer = startRawHapiServer(9092)
  }
  // =======================================
  // Resume regular startup
  console.log('[ipfs-companion] Embedded ipfs init')

  // TODO: replace with @nodeutils/defaults-deep
  const ipfsOpts = Object.assign(JSON.parse(opts.ipfsNodeConfig || optionDefaults.ipfsNodeConfig), { start: false })
  node = new Ipfs(ipfsOpts)

  return new Promise((resolve, reject) => {
    node.on('start', async () => {
      // HttpApi is off in browser context and needs to be started separately
      const httpServers = new HttpApi(node, ipfsOpts)
      nodeHttpApi = await httpServers.start()
      return resolve(node)
    })
    node.once('error', (error) => {
      console.error('[ipfs-companion] Something went terribly wrong during startup of js-ipfs!', error)
      reject(error)
    })
    node.once('ready', () => {
      node.on('error', error => {
        console.error('[ipfs-companion] Something went terribly wrong in embedded js-ipfs!', error)
      })
      node.start()
    })
  })
}

exports.destroy = async function () {
  console.log('[ipfs-companion] Embedded ipfs destroy')

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
  if (nodeHttpApi) {
    try {
      await nodeHttpApi.stop()
    } catch (err) {
      console.error(`[ipfs-companion]  failed to stop HttpApi`, err)
    }
    nodeHttpApi = null
  }
  if (node) {
    await node.stop()
    node = null
  }
}
