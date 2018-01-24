'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')
const { createProxyServer, closeProxyServer } = require('ipfs-postmsg-proxy')
const AccessControl = require('./access-control')

const ACL_FUNCTIONS = [
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
]

function createIpfsProxy (getIpfs, getState) {
  let connections = []
  const accessControl = new AccessControl(browser.storage)

  const onPortConnect = (port) => {
    if (port.name !== 'ipfs-proxy') return

    const { origin } = new URL(port.sender.url)

    const proxy = createProxyServer(getIpfs, {
      addListener: (_, handler) => port.onMessage.addListener(handler),
      removeListener: (_, handler) => port.onMessage.removeListener(handler),
      postMessage: (data) => port.postMessage(data),
      getMessageData: (d) => d,
      pre: ACL_FUNCTIONS.reduce((obj, permission) => {
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

  browser.runtime.onConnect.addListener(onPortConnect)

  const onTabUpdated = (tabId, changeInfo, tab) => {
    // Some devtools tabs do not have an ID
    if (!tabId || tabId === browser.tabs.TAB_ID_NONE) return

    // If IPFS proxy option is not enabled do not execute the content script
    if (!getState().ipfsProxy) return

    // Only inject on http(s): ipfs: or dweb:
    if (!['http', 'ipfs', 'dweb'].some(p => (tab.url || '').startsWith(p))) return

    // Only inject when loaded
    if (changeInfo.status !== 'complete') return

    try {
      browser.tabs.executeScript(tab.id, {
        file: '/dist/contentScripts/ipfs-proxy/content.js',
        runAt: 'document_start',
        allFrames: true
      })
    } catch (err) {
      console.error('Failed to execute IPFS proxy content script', err)
    }
  }

  browser.tabs.onUpdated.addListener(onTabUpdated)

  const handle = {
    destroy () {
      connections.forEach(c => c.destroy)
      browser.runtime.onConnect.removeListener(onPortConnect)
      browser.tabs.onUpdated.removeListener(onTabUpdated)
    }
  }

  return handle
}

module.exports = createIpfsProxy

function createAclPreCall (accessControl, origin, permission) {
  return async (...args) => {
    let access = await accessControl.getAccess(origin, permission)

    if (!access) {
      const { allow, blanket, remember } = await requestAccess(origin, permission)
      access = await accessControl.setAccess(origin, blanket ? '*' : permission, allow, remember)
    }

    if (!access.allow) throw new Error(`User denied access to ${permission}`)

    return args
  }
}

async function requestAccess (origin, permission) {
  const msg = `Allow ${origin} to access ipfs.${permission}?`

  // TODO: add checkbox to allow all for this origin
  let allow

  try {
    allow = window.confirm(msg)
  } catch (err) {
    console.warn('Failed to confirm, possibly not supported in this environment', err)
    allow = false
  }

  return { allow, blanket: false }
}
