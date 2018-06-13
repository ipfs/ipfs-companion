'use strict'

import rawCode from './../../../dist/bundles/ipfsProxyContentScriptPayload.bundle.js'

const browser = require('webextension-polyfill')
const injectScript = require('./inject-script')

function init () {
  const port = browser.runtime.connect({ name: 'ipfs-proxy' })

  // Forward on messages from background to the page and vice versa
  port.onMessage.addListener((data) => {
    if (data && data.sender && data.sender.startsWith('postmsg-rpc/')) {
      window.postMessage(data, '*')
    }
  })

  window.addEventListener('message', (msg) => {
    if (msg.data && msg.data.sender && msg.data.sender.startsWith('postmsg-rpc/')) {
      port.postMessage(msg.data)
    }
  })

  injectScript(rawCode)
}

// Restricting window.ipfs to Secure Context
// See: https://github.com/ipfs-shipyard/ipfs-companion/issues/476
if (window.isSecureContext) {
  init()
}
