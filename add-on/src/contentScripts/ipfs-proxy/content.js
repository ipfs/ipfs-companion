'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')

const port = browser.runtime.connect({ name: 'ipfs-proxy' })

// Forward on messages from background to the page and vice versa
port.onMessage.addListener((msg) => window.postMessage(msg, '*'))
window.addEventListener('message', (msg) => port.postMessage(msg.data))

function injectPageScript () {
  try {
    const scriptTag = document.createElement('script')
    scriptTag.src = browser.extension.getURL('dist/contentScripts/ipfs-proxy/page.js')
    scriptTag.onload = function () {
      this.parentNode.removeChild(this)
    }
    const container = document.head || document.documentElement
    container.insertBefore(scriptTag, container.children[0])
  } catch (err) {
    console.error('Failed to inject ipfs-proxy/page.js', err)
  }
}

injectPageScript()
