'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')
const { createProxyServer, closeProxyServer } = require('ipfs-postmsg-proxy')
const { expose } = require('postmsg-rpc')
const AccessControl = require('./access-control')
const createEnableCommand = require('./enable-command')
const { createPreCommand } = require('./pre-command')
const { createPreAcl } = require('./pre-acl')
const createPreMfsScope = require('./pre-mfs-scope')
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

    // https://github.com/ipfs-shipyard/ipfs-postmsg-proxy#api
    const proxyCfg = {
      addListener: (_, handler) => port.onMessage.addListener(handler),
      removeListener: (_, handler) => port.onMessage.removeListener(handler),
      postMessage: (data) => port.postMessage(data),
      getMessageData: (d) => d,
      pre: (fnName) => [
        createPreCommand(fnName),
        createPreAcl(fnName, getState, getScope, accessControl, requestAccess),
        createPreMfsScope(fnName, getScope, getIpfs)
      ]
    }

    const proxy = createProxyServer(getIpfs, proxyCfg)

    // Extend proxy with Companion-specific commands:
    const enableCommand = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    Object.assign(proxy, {
      // window.ipfs.enable(opts)
      'proxy.enable': expose('proxy.enable', enableCommand, proxyCfg)
    })

    const close = () => {
      port.onDisconnect.removeListener(onDisconnect)
      connections = connections.filter(c => c.close !== close)
      return closeProxyServer(proxy)
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
      browser.runtime.onConnect.removeListener(onPortConnect)
      return Promise.all(connections.map(c => c.close()))
    }
  }

  return handle
}

module.exports = createIpfsProxy
