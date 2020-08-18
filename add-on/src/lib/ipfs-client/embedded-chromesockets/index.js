'use strict'
/* eslint-env browser, webextensions */

/* *********************************************************
   This file is a wip sandbox.
   Code will be refactored when kinks are ironed out.
   ********************************************************* */

const debug = require('debug')
const log = debug('ipfs-companion:client:embedded')
log.error = debug('ipfs-companion:client:embedded:error')

// Polyfills required by embedded HTTP server
const uptimeStart = Date.now()
process.uptime = () => Math.floor((Date.now() - uptimeStart) / 1000)
process.hrtime = require('browser-process-hrtime')

const Ipfs = require('ipfs')
const HttpApi = require('ipfs/src/http')
const { buildConfig, syncConfig } = require('./config')

// js-ipfs + embedded hapi HTTP server
let node
let nodeHttpApi

exports.init = async function init (opts) {
  log('init embedded:chromesockets')

  const ipfsOpts = await buildConfig(opts, log)

  log('creating js-ipfs with opts: ', ipfsOpts)
  node = await Ipfs.create(ipfsOpts)
  await node.start()

  log('starting HTTP servers with opts: ', ipfsOpts)
  const httpServers = new HttpApi(node, ipfsOpts)
  nodeHttpApi = await httpServers.start()

  await syncConfig(ipfsOpts, log)

  return node
}

exports.destroy = async function () {
  log('destroy: embedded:chromesockets')

  if (nodeHttpApi) {
    try {
      await nodeHttpApi.stop()
    } catch (err) {
      // TODO: needs upstream fix like https://github.com/ipfs/js-ipfs/issues/2257
      if (err.message !== 'Cannot stop server while in stopping phase') {
        log.error('failed to stop HttpApi', err)
      }
    }
    nodeHttpApi = null
  }
  if (node) {
    await node.stop()
    node = null
  }
}
