'use strict'
/* eslint-env browser, webextensions */
import browser from 'webextension-polyfill'

export default function createWelcomePageStore (i18n, runtime) {
  return function welcomePageStore (state, emitter) {
    state.isIpfsOnline = null
    state.peerCount = null
    state.webuiRootUrl = null
    let port
    emitter.on('DOMContentLoaded', async () => {
      browser.runtime.sendMessage({ telemetry: { trackView: 'welcome' } })
      emitter.emit('render')
      port = runtime.connect({ name: 'browser-action-port' })
      port.onMessage.addListener(async (message) => {
        if (message.statusUpdate) {
          const webuiRootUrl = message.statusUpdate.webuiRootUrl
          const peerCount = message.statusUpdate.peerCount
          const isIpfsOnline = peerCount > -1
          if (isIpfsOnline !== state.isIpfsOnline || peerCount !== state.peerCount || webuiRootUrl !== state.webuiRootUrl) {
            state.webuiRootUrl = webuiRootUrl
            state.isIpfsOnline = isIpfsOnline
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
