'use strict'

const browser = require('webextension-polyfill')
const once = require('./once')
const injectScript = require('./inject-script')

window.ipfsCompanion = window.ipfsCompanion || {}
window.ipfsCompanion.once = window.ipfsCompanion.once || {}

// Only run this once for this window!
// URL can change (history API) which causes this script to be executed again,
// but it only needs to be setup once per window...
once('ipfsProxyContentScriptExecuted', () => {
  const port = browser.runtime.connect({ name: 'ipfs-proxy' })

  // Forward on messages from background to the page and vice versa
  port.onMessage.addListener((data) => window.postMessage(data, '*'))

  window.addEventListener('message', (msg) => {
    if (msg.data && msg.data.sender === 'postmsg-rpc/client') {
      port.postMessage(msg.data)
    }
  })

  injectScript(browser.extension.getURL('dist/contentScripts/ipfs-proxy/page.js'))
}, { store: window.ipfsCompanion.once })()
