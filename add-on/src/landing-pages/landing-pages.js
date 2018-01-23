'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const choo = require('choo')
const html = require('choo/html')

const welcomePage = require('./welcome-page')
const missingIpfsPage = require('./missing-ipfs-page')

require('./style.css')

const app = choo()

app.use(landingPageStore)

app.route('*', checkIpfsStatusPage)
app.route('/welcome', welcomePage)
app.route('/missing-ipfs', missingIpfsPage)

app.mount('#root')

function landingPageStore (state, emitter) {
  state.isIPFSOnline = null

  let port

  port = browser.runtime.connect({name: 'browser-action-port'})

  port.onMessage.addListener(async (message) => {
    if (message.statusUpdate) {
      const isIPFSOnline = message.statusUpdate.peerCount > -1

      if (isIPFSOnline !== state.isIPFSOnline) {
        state.isIPFSOnline = isIPFSOnline
        emitter.emit('pushState', chooseRouteByStatus(state.isIPFSOnline))
      }
    }
  })

  function chooseRouteByStatus (ipfsStatus) {
    return ipfsStatus ? '/welcome' : '/missing-ipfs'
  }
}

function checkIpfsStatusPage (state, emit) {
  return html`
  <div>
    <h1>Checking IPFS API status...</h1>
  </div>
  `
}
