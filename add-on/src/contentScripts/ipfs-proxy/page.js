'use strict'

const { assign, freeze } = Object

// TODO: (wip) this should not be injected by default into every page,
// instead should be lazy-loaded when .enable() method is called for the first time
const { createProxyClient } = require('ipfs-postmsg-proxy')

function createEnableCommand (proxyClient) {
  return {
    enable: async (opts) => {
      // Send message to proxy server for additional validation
      // eg. trigger user prompt if a list of requested capabilities is not empty
      // or fail fast and throw if IPFS Proxy is disabled globally
      await require('postmsg-rpc').call('proxy.enable', opts)
      // Create client
      const proxyClient = createProxyClient()
      // Additional client-side features
      if (opts && opts.experiments) {
        if (opts.experiments.ipfsx) {
          // Experiment: wrap API with  https://github.com/alanshaw/ipfsx
          return freeze(require('ipfsx')(proxyClient))
        }
      }
      return freeze(proxyClient)
    }
  }
}

function createWindowIpfs () {
  const proxyClient = createProxyClient()

  // Add deprecation warning to window.ipfs.<cmd>
  for (const cmd in proxyClient) {
    const fn = proxyClient[cmd]
    proxyClient[cmd] = function () {
      console.warn('Calling commands directly on window.ipfs is deprecated and will be removed in the future. To future-proof your app use API instance returned by window.ipfs.enable() instead. Current best practices can be found at: https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/window.ipfs.md')
      return fn.apply(this, arguments)
    }
  }

  // TODO: return thin object with lazy-init inside of window.ipfs.enable
  assign(proxyClient, createEnableCommand())

  return freeze(proxyClient)
}

window.ipfs = window.ipfs || createWindowIpfs()
