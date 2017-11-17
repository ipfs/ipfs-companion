'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')

module.exports = (state, emitter) => {
  Object.assign(state, {
    // UI state
    contextActionsHidden: true,
    pinHidden: false,
    pinDisabled: true,
    unPinHidden: true,
    unPinDisabled: false,
    quickUploadHidden: true,
    openWebUiHidden: true,
    currentTabUrl: null,
    // IPFS status
    ipfsOnline: false,
    gatewayAddress: null,
    swarmPeers: null,
    gatewayVersion: null,
    redirectEnabled: false
  })

  let port

  emitter.on('DOMContentLoaded', async () => {
    // A short pause allows the popup to animate in without breaking
    await new Promise((resolve) => setTimeout(resolve, 100))

    // initialize connection to the background script which will trigger UI updates
    port = browser.runtime.connect({name: 'browser-action-port'})
    port.onMessage.addListener(async (message) => {
      if (message.statusUpdate) {
        // console.log('In browser action, received message from background:', message)
        await updateBrowserActionPopup(message.statusUpdate)
        emitter.emit('render')
      }
    })
  })

  emitter.on('copyPublicGwAddr', async function copyCurrentPublicGwAddress () {
    const bg = await getBackgroundPage()
    await bg.copyAddressAtPublicGw()
    window.close()
  })

  emitter.on('copyIpfsAddr', async function copyCurrentCanonicalAddress () {
    const bg = await getBackgroundPage()
    await bg.copyCanonicalAddress()
    window.close()
  })

  emitter.on('pin', async function pinCurrentResource () {
    deactivatePinButton()
    emitter.emit('render')

    try {
      const bg = await getBackgroundPage()
      const currentPath = await resolveToIPFS(new URL(state.currentTabUrl).pathname)
      const pinResult = await bg.ipfs.pin.add(currentPath, { recursive: true })
      console.log('ipfs.pin.add result', pinResult)
      notify('notify_pinnedIpfsResourceTitle', currentPath)
    } catch (error) {
      handlePinError('notify_pinErrorTitle', error)
    }
    window.close()
  })

  emitter.on('unPin', async function unPinCurrentResource () {
    deactivatePinButton()
    emitter.emit('render')

    try {
      const bg = await getBackgroundPage()
      const currentPath = await resolveToIPFS(new URL(state.currentTabUrl).pathname)
      const result = await bg.ipfs.pin.rm(currentPath, {recursive: true})
      console.log('ipfs.pin.rm result', result)
      notify('notify_unpinnedIpfsResourceTitle', currentPath)
    } catch (error) {
      handlePinError('notify_unpinErrorTitle', error)
    }
    window.close()
  })

  async function handlePinError (errorMessageKey, error) {
    console.error(browser.i18n.getMessage(errorMessageKey), error)
    try {
      notify(errorMessageKey, error.message)
    } catch (error) {
      console.error('unable to access background page', error)
    }
  }

  emitter.on('quickUpload', () => {
    browser.tabs.create({ url: browser.extension.getURL('dist/popup/quick-upload.html') })
  })

  emitter.on('openWebUi', async () => {
    try {
      const options = await browser.storage.local.get('ipfsApiUrl')
      const apiUrl = options['ipfsApiUrl']
      await browser.tabs.create({ url: apiUrl + '/webui/' })
      window.close()
    } catch (error) {
      console.error(`Unable Open Web UI due to ${error}`)
    }
  })

  emitter.on('openPrefs', () => {
    browser.runtime.openOptionsPage().then(() => window.close())
  })

  emitter.on('toggleRedirect', async () => {
    const enabled = state.redirectEnabled
    state.redirectEnabled = !enabled
    emitter.emit('render')

    try {
      await browser.storage.local.set({useCustomGateway: !enabled})
    } catch (error) {
      console.error(`Unable to update redirect state due to ${error}`)
      state.redirectEnabled = enabled
      emitter.emit('render')
    }
  })

  async function updatePageActions (status) {
    // IPFS contexts require access to background page
    // which is denied in Private Browsing mode
    const bg = await getBackgroundPage(status)

    // Check if current page is an IPFS one
    const ipfsContext = bg && status && status.ipfsPageActionsContext

    // There is no point in displaying actions that require API interaction if API is down
    const apiIsUp = status && status.peerCount >= 0

    if (apiIsUp) {
      await activatePinButton()
    } else {
      deactivatePinButton()
    }

    if (ipfsContext) {
      state.contextActionsHidden = false
    } else {
      state.contextActionsHidden = true
    }

    state.currentTabUrl = status.currentTab.url
  }

  async function updateBrowserActionPopup (status) {
    await updatePageActions(status)
    const options = await browser.storage.local.get()

    try {
      state.redirectEnabled = options.useCustomGateway
      state.gatewayAddress = options.customGatewayUrl
    } catch (error) {
      console.error(`Unable update redirect state due to ${error}`)
      state.gatewayAddress = '???'
    }

    if (status) {
      state.swarmPeers = status.peerCount < 0 ? null : status.peerCount
      state.ipfsOnline = status.peerCount > 0
      state.gatewayVersion = status.gatewayVersion ? status.gatewayVersion : null
      state.quickUploadHidden = !state.ipfsOnline
      state.openWebUiHidden = !state.ipfsOnline
    } else {
      state.swarmPeers = null
      state.ipfsOnline = false
      state.gatewayVersion = null
      state.quickUploadHidden = true
      state.openWebUiHidden = true
    }
  }

  async function activatePinButton () {
    try {
      const bg = await getBackgroundPage()
      const currentPath = await resolveToIPFS(new URL(state.currentTabUrl).pathname)
      const response = await bg.ipfs.pin.ls(currentPath, {quiet: true})
      console.log(`positive ipfs.pin.ls for ${currentPath}: ${JSON.stringify(response)}`)
      activateUnpinning()
    } catch (error) {
      if (/is not pinned/.test(error.message)) {
        console.log(`negative ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
        activatePinning()
      } else {
        console.error(`unexpected result of ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
        deactivatePinButton()
      }
    }
  }

  function deactivatePinButton () {
    state.pinDisabled = true
    state.unPinHidden = true
  }

  function activatePinning () {
    state.pinHidden = false
    state.pinDisabled = false
    state.unPinHidden = true
  }

  function activateUnpinning () {
    state.pinHidden = true
    state.unPinHidden = false
    state.unPinDisabled = false
  }

  function notify (title, message) {
    port.postMessage({event: 'notification', title: title, message: message})
  }
}

function getBackgroundPage () {
  return browser.runtime.getBackgroundPage()
}

async function resolveToIPFS (path) {
  const bg = await getBackgroundPage()
  path = bg.safeIpfsPath(path) // https://github.com/ipfs/ipfs-companion/issues/303
  if (/^\/ipns/.test(path)) {
    const response = await bg.ipfs.name.resolve(path, {recursive: true, nocache: false})
    return response.Path
  }
  return path
}
