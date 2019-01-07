'use strict'

const { piggyback } = require('piggybacker')

const DIALOG_WIDTH = 540
const DIALOG_HEIGHT = 220
const DIALOG_PATH = 'dist/pages/proxy-access-dialog/index.html'
const DIALOG_PORT_NAME = 'proxy-access-dialog'

function createRequestAccess (browser, screen) {
  // piggybacker allows multiple requests for access to the same permissions to
  // receive the same response i.e. don't popup multiple dialogs for the
  // same permissions request.
  return piggyback(requestAccess, (scope, permissions) => `${scope}/${permissions}`)

  async function requestAccess (scope, permissions, opts) {
    opts = opts || {}

    // TODO: cleanup so below stub is not needed
    permissions = Array.isArray(permissions) ? permissions : [permissions]

    const url = browser.extension.getURL(opts.dialogPath || DIALOG_PATH)

    let dialogTabId

    if (browser.windows && browser.windows.create) {
      // display modal dialog in a centered popup window
      const currentWin = await browser.windows.getCurrent()
      const width = opts.dialogWidth || DIALOG_WIDTH
      const height = opts.dialogHeight || DIALOG_HEIGHT
      const top = Math.round(((screen.width / 2) - (width / 2)) + currentWin.left)
      const left = Math.round(((screen.height / 2) - (height / 2)) + currentWin.top)

      const dialogWindow = await browser.windows.create({ url, width, height, top, left, type: 'popup' })
      dialogTabId = dialogWindow.tabs[0].id
    } else {
      // fallback: opening dialog as a new active tab
      // (runtimes without browser.windows.create, eg. Andorid)
      dialogTabId = (await browser.tabs.create({ active: true, url: url })).id
    }

    // Resolves with { allow, wildcard }
    const userResponse = getUserResponse(dialogTabId, scope, permissions, opts)
    // Never resolves, might reject if user closes the tab
    const userTabRemoved = getUserTabRemoved(dialogTabId, scope, permissions)

    let response

    try {
      // Will the user respond to or close the dialog?
      response = await Promise.race([userTabRemoved, userResponse])
    } finally {
      userTabRemoved.destroy()
      userResponse.destroy()
    }

    await browser.tabs.remove(dialogTabId)

    return response
  }

  function getUserResponse (tabId, scope, permissions, opts) {
    opts = opts || {}

    const dialogPortName = opts.dialogPortName || DIALOG_PORT_NAME
    let onPortConnect

    const userResponse = new Promise((resolve, reject) => {
      onPortConnect = port => {
        if (port.name !== dialogPortName) return
        if (!port.sender || !port.sender.tab || port.sender.tab.id !== tabId) return

        browser.runtime.onConnect.removeListener(onPortConnect)

        // Tell the dialog what scope/permissions it is about
        port.postMessage({ scope, permissions })

        // Wait for the user response
        const onMessage = ({ allow, wildcard }) => {
          port.onMessage.removeListener(onMessage)
          resolve({ allow, wildcard })
        }

        port.onMessage.addListener(onMessage)
      }

      browser.runtime.onConnect.addListener(onPortConnect)
    })

    userResponse.destroy = () => browser.runtime.onConnect.removeListener(onPortConnect)

    return userResponse
  }

  // Since the dialog is a tab not a real dialog it can be closed by the user
  // with no response, this function creates a promise that will reject if the tab
  // is removed.
  function getUserTabRemoved (tabId, scope, permissions) {
    let onTabRemoved

    const userTabRemoved = new Promise((resolve, reject) => {
      onTabRemoved = (id) => {
        if (id !== tabId) return
        const err = new Error(`IPFS Proxy failed to obtain access response for '${permissions}' at ${scope}`)
        err.output = { payload: { isIpfsProxyError: true, isIpfsProxyAclError: true, scope, permissions } }
        reject(err)
      }
      browser.tabs.onRemoved.addListener(onTabRemoved)
    })

    userTabRemoved.destroy = () => browser.tabs.onRemoved.removeListener(onTabRemoved)

    return userTabRemoved
  }
}

module.exports = createRequestAccess
