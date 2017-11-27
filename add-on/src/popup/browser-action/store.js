'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')

// The store contains and mutates the state for the app
module.exports = (state, emitter) => {
  Object.assign(state, {
    // UI state
    isIpfsContext: false,
    isPinning: false,
    isUnPinning: false,
    isPinned: false,
    currentTabUrl: null,
    // IPFS status
    isIpfsOnline: false,
    gatewayAddress: null,
    swarmPeers: null,
    gatewayVersion: null,
    redirectEnabled: false
  })

  let port

  emitter.on('DOMContentLoaded', async () => {
    // initialize connection to the background script which will trigger UI updates
    port = browser.runtime.connect({name: 'browser-action-port'})
    port.onMessage.addListener(async (message) => {
      if (message.statusUpdate) {
        // console.log('In browser action, received message from background:', message)
        await updateBrowserActionState(message.statusUpdate)
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
    state.isPinning = true
    emitter.emit('render')

    try {
      const bg = await getBackgroundPage()
      const currentPath = await resolveToIPFS(new URL(state.currentTabUrl).pathname)
      const pinResult = await bg.ipfs.pin.add(currentPath, { recursive: true })
      console.log('ipfs.pin.add result', pinResult)
      notify('notify_pinnedIpfsResourceTitle', currentPath)
      state.isPinned = true
    } catch (error) {
      handlePinError('notify_pinErrorTitle', error)
    }
    state.isPinning = false
    emitter.emit('render')
    window.close()
  })

  emitter.on('unPin', async function unPinCurrentResource () {
    state.isUnPinning = true
    emitter.emit('render')

    try {
      const bg = await getBackgroundPage()
      const currentPath = await resolveToIPFS(new URL(state.currentTabUrl).pathname)
      const result = await bg.ipfs.pin.rm(currentPath, {recursive: true})
      console.log('ipfs.pin.rm result', result)
      notify('notify_unpinnedIpfsResourceTitle', currentPath)
      state.isPinned = false
    } catch (error) {
      handlePinError('notify_unpinErrorTitle', error)
    }
    state.isUnPinning = true
    emitter.emit('render')
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
    window.close()
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
    browser.runtime.openOptionsPage()
      .then(() => window.close())
      .catch((err) => {
        console.error('runtime.openOptionsPage() failed, opening options page in tab instead.', err)
        // brave: fallback to opening options page as a tab.
        browser.tabs.create({ url: browser.extension.getURL('dist/options/options.html') })
      })
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

  async function updatePageActionsState (status) {
    // IPFS contexts require access to background page
    // which is denied in Private Browsing mode
    const bg = await getBackgroundPage(status)

    // Check if current page is an IPFS one
    const ipfsContext = bg && status && status.ipfsPageActionsContext

    state.isIpfsContext = !!ipfsContext
    state.currentTabUrl = status.currentTab.url

    if (state.isIpfsContext) {
      // There is no point in displaying actions that require API interaction if API is down
      const apiIsUp = status && status.peerCount >= 0
      if (apiIsUp) await updatePinnedState(status)
    }
  }

  async function updateBrowserActionState (status) {
    await updatePageActionsState(status)
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
      state.isIpfsOnline = status.peerCount > 0
      state.gatewayVersion = status.gatewayVersion ? status.gatewayVersion : null
    } else {
      state.swarmPeers = null
      state.isIpfsOnline = false
      state.gatewayVersion = null
    }
  }

  async function updatePinnedState (status) {
    try {
      const bg = await getBackgroundPage()
      const currentPath = await resolveToIPFS(new URL(status.currentTab.url).pathname)
      const response = await bg.ipfs.pin.ls(currentPath, {quiet: true})
      console.log(`positive ipfs.pin.ls for ${currentPath}: ${JSON.stringify(response)}`)
      state.isPinned = true
    } catch (error) {
      if (/is not pinned/.test(error.message)) {
        console.log(`negative ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
      } else {
        console.error(`unexpected result of ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
      }
      state.isPinned = false
    }
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
