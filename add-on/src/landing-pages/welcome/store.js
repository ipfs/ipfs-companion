'use strict'
/* eslint-env browser, webextensions */
import browser from 'webextension-polyfill'
import ipfsStatus from '../../lib/ipfsStatus.js'

export default function createWelcomePageStore (i18n, runtime) {
  return function welcomePageStore (state, emitter) {
    state.isIpfsOnline = null
    state.peerCount = null
    state.webuiRootUrl = null
    emitter.on('DOMContentLoaded', async () => {
      emitter.emit('render')
      const { webuiRootUrl, isIpfsOnline, peerCount } = ipfsStatus;
      if (isIpfsOnline !== state.isIpfsOnline || peerCount !== state.peerCount || webuiRootUrl !== state.webuiRootUrl) {
        state.webuiRootUrl = webuiRootUrl
        state.isIpfsOnline = isIpfsOnline
        state.peerCount = peerCount
        emitter.emit('render')
      }

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
