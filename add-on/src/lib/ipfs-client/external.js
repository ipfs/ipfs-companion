'use strict'
/* eslint-env browser */

const IpfsApi = require('ipfs-api')

exports.init = async function (opts) {
  console.log('[ipfs-companion] External ipfs init', opts.apiURLString)

  const url = opts.apiURL
  const api = IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
  return api
}

exports.destroy = async function () {
  console.log('[ipfs-companion] External ipfs destroy')
}

// TODO: Upgrade to a caching proxy for ipfs-api
