'use strict'
/* eslint-env browser */

const browser = require('webextension-polyfill')

const DIALOG_WIDTH = 540
const DIALOG_HEIGHT = 200

async function requestAccess (origin, permission) {
  const url = browser.extension.getURL('dist/pages/proxy-access-dialog/index.html')
  const currentWin = await browser.windows.getCurrent()
  const { tabs } = await browser.windows.create({
    url,
    width: DIALOG_WIDTH,
    height: DIALOG_HEIGHT,
    top: Math.round(((screen.width / 2) - (DIALOG_WIDTH / 2)) + currentWin.left),
    left: Math.round(((screen.height / 2) - (DIALOG_HEIGHT / 2)) + currentWin.top),
    type: 'popup'
  })

  // Resolves with { allow, remember }
  const userResponse = getUserResponse(tabs[0].id, origin, permission)
  // Never resolves, might reject if user closes the tab
  const userTabRemoved = getUserTabRemoved(tabs[0].id, origin, permission)

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

function getUserResponse (tabId, origin, permission) {
  let onPortConnect

  const userResponse = new Promise((resolve, reject) => {
    onPortConnect = port => {
      if (port.name !== 'proxy-access-dialog') return

      browser.runtime.onConnect.removeListener(onPortConnect)

      // Tell the dialog what origin/permission it is about
      port.postMessage({ origin, permission })

      // Wait for the user response
      const onMessage = ({ allow, remember }) => {
        port.onMessage.removeListener(onMessage)
        resolve({ allow, remember })
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
function getUserTabRemoved (tabId, origin, permission) {
  let onTabRemoved

  const userTabRemoved = new Promise((resolve, reject) => {
    onTabRemoved = () => reject(new Error(`Failed to obtain access response for ${permission} at ${origin}`))
    browser.tabs.onRemoved.addListener(onTabRemoved)
  })

  userTabRemoved.destroy = () => browser.tabs.onRemoved.removeListener(onTabRemoved)

  return userTabRemoved
}

module.exports = requestAccess
