'use strict'
/* eslint-env browser, webextensions */

function createWelcomePageStore (i18n, runtime) {
  return function welcomePageStore (state, emitter) {
    state.isIpfsOnline = null
    state.peerCount = null
    let port
    emitter.on('DOMContentLoaded', async () => {
      emitter.emit('render')
      port = runtime.connect({ name: 'browser-action-port' })
      port.onMessage.addListener(async (message) => {
        if (message.statusUpdate) {
          const peerCount = message.statusUpdate.peerCount
          const isIpfsOnline = peerCount > -1
          if (isIpfsOnline !== state.isIpfsOnline || peerCount !== state.peerCount) {
            state.isIpfsOnline = isIpfsOnline
            state.peerCount = peerCount
            emitter.emit('render')
          }
        }
      })
    })
  }
}

module.exports = createWelcomePageStore
