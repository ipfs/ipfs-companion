'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { createProxyServer, closeProxyServer } = require('ipfs-postmsg-proxy')
const AccessControl = require('./access-control')

module.exports = function createIpfsProxy (getIpfs) {
  let connections = []
  const accessControl = new AccessControl()

  const onConnect = (port) => {
    const { origin } = new URL(port.sender.url)

    const proxy = createProxyServer(getIpfs, {
      addListener: (_, handler) => port.onMessage.addListener(handler),
      removeListener: (_, handler) => port.onMessage.removeListener(handler),
      postMessage: (data) => port.postMessage(data),
      getMessageData: (d) => d,
      pre: [
        'block.put',
        'config.set',
        'config.get',
        'config.replace',
        'dag.put',
        'dht.put',
        'dht.provide',
        'files.add',
        'key.get',
        'key.list',
        'key.rename',
        'key.rm',
        'object.new',
        'object.put',
        'object.patch.addLink',
        'object.patch.rmLink',
        'object.patch.appendData',
        'object.patch.setData',
        'pin.add',
        'pin.rm',
        'pubsub.publish',
        'swarm.connect',
        'swarm.disconnect'
      ].reduce((obj, permission) => {
        obj[permission] = createAclPreCall(accessControl, origin, permission)
        return obj
      }, {})
    })

    const close = () => {
      closeProxyServer(proxy)
      port.onDisconnect.removeListener(onDisconnect)
      connections = connections.filter(c => c.close !== close)
    }

    const onDisconnect = () => close()

    port.onDisconnect.addListener(onDisconnect)

    connections.push({ close })
  }

  browser.runtime.onConnect.addListener(onConnect)

  return { destroy: () => connections.forEach(c => c.destroy) }
}

function createAclPreCall (accessControl, origin, permission) {
  return async (...args) => {
    let access = await accessControl.getAccess(origin, permission)

    if (!access) {
      const { allow, blanket, remember } = await accessControl.requestAccess(origin, permission)
      access = await accessControl.setAccess(origin, blanket ? '*' : permission, allow, remember)
    }

    if (!access.allow) throw new Error(`User denied access to ${permission}`)

    return args
  }
}
