'use strict'

process.hrtime = require('browser-process-hrtime')

const Ipfs = require('ipfs')
const { optionDefaults } = require('../options')
const http = require('http') // courtesy of chrome-net

const Hapi = require('hapi')

let node = null
let httpServer = null
let hapiServer = null

exports.init = function init (opts) {
  console.log('[ipfs-companion] Embedded ipfs init')

  node = new Ipfs(
    JSON.parse(opts.ipfsNodeConfig || optionDefaults.ipfsNodeConfig)
  )

  // find first free port and start http server
  if (!httpServer) {
    let port = 9091
    httpServer = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello from ipfs-companion exposing HTTP via chrome.sockets in Brave :-)\n')
    })
    httpServer.listen(port, '127.0.0.1')
    console.log(`[ipfs-companion] started demo HTTP server on http://127.0.0.1:${port}`)
  }

  // find first free port and start http server
  if (!hapiServer) {
    let port = 9092
    let options = {
      debug: {
        log: ['*'],
        request: ['*']
      }
    }
    hapiServer = new Hapi.Server(options)
    hapiServer.connection({
      host: '127.0.0.1',
      port
    })

    hapiServer.route({
      method: 'GET',
      path: '/',
      handler: function (request, reply) {
        console.log('[ipfs-companion] hapiServer processing request', request)
        return reply('Hello')
      }
    })

    hapiServer.start((err) => {
      if (err) console.error(`[ipfs-companion] Failed to start Hapi`, err)
      console.log(`[ipfs-companion] started demo Hapi server on http://127.0.0.1:${port}`)
    })
  }

  if (node.isOnline()) {
    return Promise.resolve(node)
  }

  return new Promise((resolve, reject) => {
    // TODO: replace error listener after a 'ready' event.
    node.once('error', (err) => reject(err))
    node.once('ready', () => resolve(node))
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
    hapiServer.stop({ timeout: 1000 }).then(function (err) {
      if (err) {
        console.error(`[ipfs-companion]  failed to stop hapi`, err)
      } else {
        console.log('[ipfs-companion] hapi server stopped')
      }
    })
    httpServer = null
  }

  await node.stop()
  node = null
}
