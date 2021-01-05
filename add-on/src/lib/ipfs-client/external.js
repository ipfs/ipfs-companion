'use strict'
/* eslint-env browser */

const debug = require('debug')
const log = debug('ipfs-companion:client:external')
log.error = debug('ipfs-companion:client:external:error')

const httpClient = require('ipfs-http-client')

exports.init = async function (browser, opts) {
  log(`init with IPFS API at ${opts.apiURLString}`)
  const clientConfig = opts.apiURLString
  // https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client#importing-the-module-and-usage
  const api = httpClient(clientConfig)
  return api
}

exports.destroy = async function (browser) {
  log('destroy')
}
