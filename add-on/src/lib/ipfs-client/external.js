'use strict'
/* eslint-env browser */

const IpfsApi = require('ipfs-api')

exports.init = async function (opts) {
  console.log('[ipfs-companion] External ipfs init')

  const url = new URL(opts.ipfsApiUrl)
  const api = IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
  return api
}

exports.destroy = async function () {
  console.log('[ipfs-companion] Embedded ipfs destroy')
}

// TODO: I become a caching proxy for ipfs-api
