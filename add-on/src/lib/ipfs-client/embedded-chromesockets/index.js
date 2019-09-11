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
  node = new Ipfs(ipfsOpts)

  return new Promise((resolve, reject) => {
    node.once('error', (error) => {
      log.error('something went terribly wrong during startup of js-ipfs!', error)
      reject(error)
    })
    node.once('ready', async () => {
      node.once('start', async () => {
        // HttpApi is off in browser context and needs to be started separately
        try {
          const httpServers = new HttpApi(node, ipfsOpts)
          nodeHttpApi = await httpServers.start()
          await syncConfig(node, opts, log)
          resolve(node)
        } catch (err) {
          reject(err)
        }
      })
      try {
        node.on('error', error => {
          log.error('something went terribly wrong in embedded js-ipfs!', error)
        })
        await node.start()
      } catch (err) {
        reject(err)
      }
    })
  })
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
    const stopped = new Promise((resolve, reject) => {
      node.on('stop', resolve)
      node.on('error', reject)
    })
    try {
      await node.stop()
    } catch (err) {
      // TODO: remove when fixed upstream: https://github.com/ipfs/js-ipfs/issues/2257
      if (err.message === 'Not able to stop from state: stopping') {
        log('destroy: embedded:chromesockets waiting for node.stop()')
        await stopped
      } else {
        throw err
      }
    }
    node = null
  }
}
