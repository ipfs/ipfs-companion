'use strict'
/* eslint-env browser, webextensions */

/*
 * Content-script for injection a window.ipfs global into every
 * page. Getting content and ID works like normal but adding
 * or pinning content requires a permission dialog to have been
 * accepted.
 */

// const ipfsApi = require('ipfs-api')
// const ipfs = new ipfsApi()

// a call looks like {func: 'add', args: [buffer]}
//
var myPort = browser.runtime.connect({name: 'post-from-cs'})

myPort.onMessage.addListener(function(m) {
  console.log('received content-script <- background-page', m)
  console.log('sending content-script -> inpage')
  // repeating here because addEventListener catches this again?
  window.postMessage({...m, from: 'content-script'}, '*')
  // this needs to be sent to
})

window.addEventListener('message', (msg) => {
  if (msg.data.from === 'inpage') {
  console.log('received content-script <- inpage', msg)
  console.log('sending content-script -> background-page')
  myPort.postMessage({...msg.data, from: 'content-script'})
  }
})

const inpageBundle = `
  window.ipfs = {
    id: (callback) => {
      console.log('=== FIRST ===')
      window.addEventListener('message', function(msg) {
        if (msg.data.from === 'content-script') {
          console.log('received inpage <- content-script', msg)
          callback(msg.data.err, msg.data.res)
          window.removeEventListener('message', arguments.callee, false)
        }
      }, false)
      window.postMessage({func: 'id', args: [], from: 'inpage'}, '*')
    },
    add: (content, callback) => {
      console.log('=== FIRST ===')
      window.addEventListener('message', function(msg) {
        if (msg.data.from === 'content-script') {
          console.log('received inpage <- content-script', msg)
          callback(msg.data.err, msg.data.res)
          window.removeEventListener('message', arguments.callee, false)
        }
      }, false)
      window.postMessage({func: 'id', args: [], from: 'inpage'}, '*')
    },
    // add: (content, callback) => {
    //   console.log('adding content')
    //   // postMsg()
    //   // ipfs.add(content, callback)
    //   callback(null, [{hash: 'lol'}])
    // },
    // cat: (hash, callback) => {
    //   callback(null, 'This is the content you had since before')
    // }
  }
`

function setupInjection () {
  try {
    // inject in-page script
    var scriptTag = document.createElement('script')
    scriptTag.textContent = inpageBundle
    scriptTag.onload = function () {
      this.parentNode.removeChild(this)
    }
    var container = document.head || document.documentElement
    container.insertBefore(scriptTag, container.children[0])
  } catch (e) {
    console.error('Inpage IPFS loading failed', e)
  }
}

setupInjection()
