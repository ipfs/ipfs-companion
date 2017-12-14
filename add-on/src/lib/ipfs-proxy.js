'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { expose } = require('postmsg-rpc')

module.exports = function createIpfsProxy (getIpfs) {
  let connections = []

  const onConnect = (port) => {
    const proxy = createProxy(getIpfs, port)

    const destroy = () => {
      Object.keys(proxy).forEach((k) => k.close && k.close())
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

function createProxy (getIpfs, port) {
  return {
    id: expose('ipfs.id', () => getIpfs().id(), {
      addListener: (_, handler) => port.onMessage.addListener(handler),
      removeListener: (_, handler) => port.onMessage.removeListener(handler),
      postMessage: (data) => port.postMessage(data),
      getMessageData: (d) => d
    })
  }
}
