'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')
const { createProxyServer, closeProxyServer } = require('ipfs-postmsg-proxy')
const AccessControl = require('./access-control')
const createPreAcl = require('./pre-acl')
const createRequestAccess = require('./request-access')

// Creates an object that manages the "server side" of the IPFS proxy
function createIpfsProxy (getIpfs, getState) {
  let connections = []
  const accessControl = new AccessControl(browser.storage)
  const requestAccess = createRequestAccess(browser, screen)

  // Port connection events are emitted when a content script attempts to
  // communicate with us. Each new URL visited by the user will open a port.
  // When a port is opened, we create a new IPFS proxy server to listen to the
  // messages.
  const onPortConnect = (port) => {
    if (port.name !== 'ipfs-proxy') return

    const getScope = async () => {
      const tab = await browser.tabs.get(port.sender.tab.id)
      const { origin, pathname } = new URL(tab.url)
      return origin + pathname
    }

    const proxy = createProxyServer(getIpfs, {
      addListener: (_, handler) => port.onMessage.addListener(handler),
      removeListener: (_, handler) => port.onMessage.removeListener(handler),
      postMessage: (data) => port.postMessage(data),
      getMessageData: (d) => d,
      pre: (fnName) => createPreAcl(getState, accessControl, getScope, fnName, requestAccess)
    })

    const close = () => {
      closeProxyServer(proxy)
      port.onDisconnect.removeListener(onDisconnect)
      connections = connections.filter(c => c.close !== close)
    }

    const onDisconnect = () => close()

    // If the port disconnects, clean up the resources for this connection
    port.onDisconnect.addListener(onDisconnect)

    // Keep track of the open connections so that if destroy is called we can
    // clean up properly.
    connections.push({ close })
  }

  browser.runtime.onConnect.addListener(onPortConnect)

  const handle = {
    destroy () {
      connections.forEach(c => c.destroy)
      browser.runtime.onConnect.removeListener(onPortConnect)
    }
  }

  return handle
}

module.exports = createIpfsProxy
