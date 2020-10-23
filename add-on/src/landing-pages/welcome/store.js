'use strict'
/* eslint-env browser, webextensions */
const browser = require('webextension-polyfill')

function createWelcomePageStore (i18n, runtime) {
  return function welcomePageStore (state, emitter) {
    state.apiAvailable = null
    state.peerCount = null
    state.webuiRootUrl = null
    let port
    emitter.on('DOMContentLoaded', async () => {
      emitter.emit('render')
      port = runtime.connect({ name: 'browser-action-port' })
      port.onMessage.addListener(async (message) => {
        if (message.statusUpdate) {
          const { webuiRootUrl, peerCount, apiAvailable } = message.statusUpdate
          if (apiAvailable !== state.apiAvailable || peerCount !== state.peerCount || webuiRootUrl !== state.webuiRootUrl) {
            state.webuiRootUrl = webuiRootUrl
            state.apiAvailable = apiAvailable
            state.peerCount = peerCount
            emitter.emit('render')
          }
        }
      })
    })

    emitter.on('openWebUi', async (page = '/') => {
      const url = `${state.webuiRootUrl}#${page}`
      try {
        await browser.tabs.create({ url })
      } catch (error) {
        console.error(`Unable Open Web UI (${url})`, error)
      }
    })
  }
}

module.exports = createWelcomePageStore
