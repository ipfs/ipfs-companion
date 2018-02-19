'use strict'

const DIALOG_WIDTH = 540
const DIALOG_HEIGHT = 220
const DIALOG_PATH = 'dist/pages/proxy-access-dialog/index.html'
const DIALOG_PORT_NAME = 'proxy-access-dialog'

function createRequestAccess (browser, screen) {
  return async function requestAccess (scope, permission, opts) {
    opts = opts || {}

    const width = opts.dialogWidth || DIALOG_WIDTH
    const height = opts.dialogHeight || DIALOG_HEIGHT

    const url = browser.extension.getURL(opts.dialogPath || DIALOG_PATH)
    const currentWin = await browser.windows.getCurrent()

    const top = Math.round(((screen.width / 2) - (width / 2)) + currentWin.left)
    const left = Math.round(((screen.height / 2) - (height / 2)) + currentWin.top)

    const { tabs } = await browser.windows.create({ url, width, height, top, left, type: 'popup' })

    // Resolves with { allow, wildcard }
    const userResponse = getUserResponse(tabs[0].id, scope, permission, opts)
    // Never resolves, might reject if user closes the tab
    const userTabRemoved = getUserTabRemoved(tabs[0].id, scope, permission)

    let response

    try {
      // Will the user respond to or close the dialog?
      response = await Promise.race([userTabRemoved, userResponse])
    } finally {
      userTabRemoved.destroy()
      userResponse.destroy()
    }

    await browser.tabs.remove(tabs[0].id)

    return response
  }

  function getUserResponse (tabId, scope, permission, opts) {
    opts = opts || {}

    const dialogPortName = opts.dialogPortName || DIALOG_PORT_NAME
    let onPortConnect

    const userResponse = new Promise((resolve, reject) => {
      onPortConnect = port => {
        if (port.name !== dialogPortName) return

        browser.runtime.onConnect.removeListener(onPortConnect)

        // Tell the dialog what scope/permission it is about
        port.postMessage({ scope, permission })

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
  function getUserTabRemoved (tabId, scope, permission) {
    let onTabRemoved

    const userTabRemoved = new Promise((resolve, reject) => {
      onTabRemoved = () => reject(new Error(`Failed to obtain access response for ${permission} at ${scope}`))
      browser.tabs.onRemoved.addListener(onTabRemoved)
    })

    userTabRemoved.destroy = () => browser.tabs.onRemoved.removeListener(onTabRemoved)

    return userTabRemoved
  }
}

module.exports = createRequestAccess
