'use strict'
/* eslint-env browser */

import debug from 'debug'

import { create } from 'kubo-rpc-client'
const log = debug('ipfs-companion:client:external')
log.error = debug('ipfs-companion:client:external:error')

export async function init (browser, opts) {
  log(`init with IPFS API at ${opts.apiURLString}`)
  const clientConfig = opts.apiURLString
  const api = await create(clientConfig)
  return api
}

export async function destroy (browser) {
  log('destroy')
}
