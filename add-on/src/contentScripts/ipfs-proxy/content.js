'use strict'

const browser = require('webextension-polyfill')
const injectScript = require('./inject-script')
const fs = require('fs')

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

  // browserify inlines contents of this file
  const code = fs.readFileSync(`${__dirname}/../../../dist/contentScripts/ipfs-proxy/page.js`, 'utf8')

  injectScript(code)
}

init()
