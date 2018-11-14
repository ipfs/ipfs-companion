'use strict'

const _Buffer = Buffer

// TODO: this should not be injected by default into every page,
// instead should be lazy-loaded when .enable() method is called for the first time
const { createProxyClient } = require('ipfs-postmsg-proxy')

function windowIpfs2 () {
  return Object.freeze({
    enable: async (args) => {
      // TODO:  pass args to ipfs-postmsg-proxy constructor
      // to trigger user prompt if list of requested capabilities is not empty
      const proxyClient = createProxyClient()
      console.log('Called window.ipfs.enable', args)
      return proxyClient
    }
  })
}

// TODO: we should remove Buffer and add support for Uint8Array/ArrayBuffer natively
window.Buffer = window.Buffer || _Buffer
window.ipfs = window.ipfs || windowIpfs2()
