'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { createProxyServer, closeProxyServer } = require('ipfs-postmsg-proxy')

module.exports = function createIpfsProxy (getIpfs) {
  let connections = []

  const onConnect = (port) => {
    const proxy = createProxyServer(getIpfs, {
      addListener: (_, handler) => port.onMessage.addListener(handler),
      removeListener: (_, handler) => port.onMessage.removeListener(handler),
      postMessage: (data) => port.postMessage(data),
      getMessageData: (d) => d
    })

    const destroy = () => {
      closeProxyServer(proxy)
      port.onDisconnect.removeListener(onDisconnect)
      connections = connections.filter(c => c.destroy !== destroy)
    }

    const onDisconnect = () => destroy()

    port.onDisconnect.addListener(onDisconnect)

    connections.push({ destroy })
  }

  browser.runtime.onConnect.addListener(onConnect)

  return { destroy: () => connections.forEach(c => c.destroy) }
}
