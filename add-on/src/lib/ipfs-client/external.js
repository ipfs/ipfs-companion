'use strict'
/* eslint-env browser */

const IpfsApi = require('ipfs-api')
const log = require('../log')('api:external')

exports.init = async function (opts) {
  log('IPFS init using API at %s', opts.apiURLString)

  const url = opts.apiURL
  const api = IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
  return api
}

exports.destroy = async function () {
  log('IPFS API client destroy')
}

// TODO: Upgrade to a caching proxy for ipfs-api
