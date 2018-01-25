'use strict'

const browser = require('webextension-polyfill')
const injectScript = require('./inject-script')

function init () {
  const port = browser.runtime.connect({ name: 'ipfs-proxy' })

  // Forward on messages from background to the page and vice versa
  port.onMessage.addListener((data) => window.postMessage(data, '*'))

  window.addEventListener('message', (msg) => {
    if (msg.data && msg.data.sender === 'postmsg-rpc/client') {
      port.postMessage(msg.data)
    }
  })

  injectScript(browser.extension.getURL('dist/contentScripts/ipfs-proxy/page.js'))
}

// Only run this once for this window!
// URL can change (history API) which causes this script to be executed again,
// but it only needs to be setup once per window...
if (!window.__ipfsProxyContentInitialized) {
  init()
  window.__ipfsProxyContentInitialized = true
}
