'use strict'

const _Buffer = Buffer

// TODO: (wip) this should not be injected by default into every page,
// instead should be lazy-loaded when .enable() method is called for the first time
const { createProxyClient } = require('ipfs-postmsg-proxy')
const { call } = require('postmsg-rpc')

function createEnableCommand (proxyClient) {
  return {
    enable: async (opts) => {
      // Send message to proxy server for additional validation
      // eg. trigger user prompt if a list of requested capabilities is not empty
      // or fail fast and throw if IPFS Proxy is disabled globally
      await call('proxy.enable', opts)
      // Additional client-side features
      if (opts) {
        if (opts.ipfsx === true) {
          // TODO: wrap API in https://github.com/alanshaw/ipfsx
          // return ipfsx(proxyClient)
        }
      }
      return Object.freeze(proxyClient)
    }
  }
}

function createWindowIpfs () {
  const proxyClient = createProxyClient()
  Object.assign(proxyClient, createEnableCommand(proxyClient))
  // TODO: return thin object with lazy-init inside of window.ipfs.enable
  return Object.freeze(proxyClient)
}

// TODO: we should remove Buffer and add support for Uint8Array/ArrayBuffer natively
// See: https://github.com/ipfs/interface-ipfs-core/issues/404
window.Buffer = window.Buffer || _Buffer
window.ipfs = window.ipfs || createWindowIpfs()
