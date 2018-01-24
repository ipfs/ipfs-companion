'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')
const { createProxyServer, closeProxyServer } = require('ipfs-postmsg-proxy')
const AccessControl = require('./access-control')

// These are the functions that require an allow/deny decision by the user.
// All other exposed IPFS functions are available to call without authorization.
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

// Creates an object that manages the "server side" of the IPFS proxy
function createIpfsProxy (getIpfs, getState) {
  let connections = []
  const accessControl = new AccessControl(browser.storage)

  // When a new URL is visited, we execute a content script, which creates
  // a `window.ipfs` object on the page and opens up a new port so that the
  // `window.ipfs` proxy can talk to us.
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

  // Port connection events are emitted when a content script attempts to
  // communicate with us. Each new URL visited by the user will open a port.
  // When a port is opened, we create a new IPFS proxy server to listen to the
  // messages.
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
      browser.tabs.onUpdated.removeListener(onTabUpdated)
      browser.runtime.onConnect.removeListener(onPortConnect)
    }
  }

  return handle
}

module.exports = createIpfsProxy

// Creates a "pre" function that is called prior to calling a real function
// on the IPFS instance. It will throw if access is denied, and ask the user if
// no access decision has been made yet.
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
