'use strict'
/* eslint-env browser, webextensions */

// Required by HTTP server
process.hrtime = require('browser-process-hrtime')

const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')
const http = require('http') // courtesy of chrome-net
const Hapi = require('hapi') // courtesy of js-ipfs

let node = null
let httpServer = null
let hapiServer = null

// Enable some debug output from js-ipfs
// (borrowed from https://github.com/ipfs-shipyard/ipfs-companion/pull/557)
// to  include everything (mplex, libp2p, mss): localStorage.debug = '*'
localStorage.debug = 'jsipfs*,ipfs*,-*:mfs*,-*:ipns*'

exports.init = function init (opts) {
  // BRAVE TESTS FIRST
  // TODO: remove after experiments are done
  // =======================================
  // [x] start raw http server (http.createServer)
  // [x] start raw Hapi server (Hapi.Server)
  //     [x] return response
  // [ ] start js-ipfs with Gateway exposed by embedded Hapi server
  //     - [x] disabling DHT in libp2p solved `TypeError: this._dht.on is not a function`,
  //     - [ ] Gateway does not start for some reason, nothing in logs
  // =======================================
  // TEST RAW require('http') SERVER
  if (!httpServer) {
    let port = 9091
    httpServer = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello from ipfs-companion exposing HTTP via chrome.sockets in Brave :-)\n')
    })
    httpServer.listen(port, '127.0.0.1')
    console.log(`[ipfs-companion] require('http') HTTP server on http://127.0.0.1:${port}`)
  }
  // =======================================
  // TEST require('hapi') HTTP SERVER (same as in js-ipfs)
  if (!hapiServer) {
    let port = 9092
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
      hapiServer = new Hapi.Server(options)
      await hapiServer.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
          console.log('[ipfs-companion] hapiServer processing request', request)
          return 'Hello from ipfs-companion+Hapi.js exposing HTTP via chrome.sockets in Brave :-)'
        }
      })
      // await hapiServer.register({
      // })
      await hapiServer.start()
      console.log(`[ipfs-companion] require('hapi') HTTP server running at: ${hapiServer.info.uri}`)
    }
    initHapi()
  }
  // =======================================
  // Resume regular startup
  console.log('[ipfs-companion] Embedded ipfs init')

  node = new Ipfs(
    JSON.parse(opts.ipfsNodeConfig || optionDefaults.ipfsNodeConfig)
  )

  if (node.isOnline()) {
    return Promise.resolve(node)
  }

  return new Promise((resolve, reject) => {
    // TODO: replace error listener after a 'ready' event.
    node.once('error', (error) => {
      console.error('[ipfs-companion] Something went terribly wrong during startup of js-ipfs!', error)
      reject(error)
    })
    node.once('ready', () => {
      node.on('error', error => {
        console.error('[ipfs-companion] Something went terribly wrong in embedded js-ipfs!', error)
      })
      return resolve(node)
    })
  })
}

exports.destroy = async function () {
  console.log('[ipfs-companion] Embedded ipfs destroy')
  if (!node) return

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

  await node.stop()
  node = null
}
