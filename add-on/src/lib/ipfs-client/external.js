'use strict'
/* eslint-env browser */

import debug from 'debug'
const log = debug('ipfs-companion:client:external')
log.error = debug('ipfs-companion:client:external:error')

import { create } from 'ipfs-http-client'

export async function init (browser, opts) {
  log(`init with IPFS API at ${opts.apiURLString}`)
  const clientConfig = opts.apiURLString
  // https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client#importing-the-module-and-usage
  const api = await create(clientConfig)
  return api
}

export async function destroy (browser) {
  log('destroy')
}
