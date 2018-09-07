'use strict'
/* eslint-env browser, webextensions */

function createWelcomePageStore (i18n, runtime) {
  return function welcomePageStore (state, emitter) {
    state.isIpfsOnline = null

    const port = runtime.connect({ name: 'browser-action-port' })

    const onMessage = (message) => {
      if (message.statusUpdate) {
        const isIpfsOnline = message.statusUpdate.peerCount > -1

        if (isIpfsOnline !== state.isIpfsOnline) {
          state.isIpfsOnline = isIpfsOnline
          emitter.emit('render')
        }
      }
    }

    port.onMessage.addListener(onMessage)

    emitter.on('DOMContentLoaded', async () => {
      emitter.emit('render')
    })
  }
}

module.exports = createWelcomePageStore
