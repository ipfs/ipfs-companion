'use strict'
/* eslint-env browser */

const debug = require('debug')
const log = debug('ipfs-companion:client:external')
log.error = debug('ipfs-companion:client:external:error')

const IpfsApi = require('ipfs-http-client')

exports.init = async function (opts) {
  log(`init with API: ${opts.apiURLString}`)

  const url = opts.apiURL
  const protocol = url.protocol.substr(0, url.protocol.length - 1) // http: -> http
  const host = url.hostname.replace(/[[\]]+/g, '') // temporary fix for ipv6: https://github.com/ipfs-shipyard/ipfs-companion/issues/668
  const api = IpfsApi({ host, port: url.port, protocol })
  return api
}

exports.destroy = async function () {
  log('destroy')
}

// TODO: Upgrade to a caching proxy for ipfs-http-client
