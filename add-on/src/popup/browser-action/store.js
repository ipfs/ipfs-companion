'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { safeIpfsPath } = require('../../lib/ipfs-path')

// The store contains and mutates the state for the app
module.exports = (state, emitter) => {
  Object.assign(state, {
    // UI state
    isIpfsContext: false,
    isPinning: false,
    isUnPinning: false,
    isPinned: false,
    currentTab: null,
    // IPFS status
    ipfsNodeType: 'external',
    isIpfsOnline: false,
    ipfsApiUrl: null,
    publicGatewayUrl: null,
    gatewayAddress: null,
    swarmPeers: null,
    gatewayVersion: null,
    redirectEnabled: false
  })

  let port

  emitter.on('DOMContentLoaded', async () => {
    // initial render with status stub
    emitter.emit('render')
    // initialize connection to the background script which will trigger UI updates
    port = browser.runtime.connect({name: 'browser-action-port'})
    port.onMessage.addListener(async (message) => {
      if (message.statusUpdate) {
        let status = message.statusUpdate
        console.log('In browser action, received message from background:', message)
        await updateBrowserActionState(status)
        emitter.emit('render')
        if (status.ipfsPageActionsContext) {
          // calculating pageActions states is expensive (especially pin-related checks)
          // we update them in separate step to keep UI snappy
          await updatePageActionsState(status)
          emitter.emit('render')
        }
      }
    })
    // fix for https://github.com/ipfs-shipyard/ipfs-companion/issues/318
    setTimeout(() => {
      document.body.style.height = window.innerHeight + 1 + 'px'
      setTimeout(() => document.body.style.removeProperty('height'), 50)
    }, 100)
  })

  emitter.on('copyPublicGwAddr', async function copyCurrentPublicGwAddress () {
    port.postMessage({ event: 'copyAddressAtPublicGw' })
    window.close()
  })

  emitter.on('copyIpfsAddr', async function copyCurrentCanonicalAddress () {
    port.postMessage({ event: 'copyCanonicalAddress' })
    window.close()
  })

  emitter.on('pin', async function pinCurrentResource () {
    state.isPinning = true
    emitter.emit('render')

    try {
      const ipfs = await getIpfsApi()
      const currentPath = await resolveToIPFS(ipfs, new URL(state.currentTab.url).pathname)
      const pinResult = await ipfs.pin.add(currentPath, { recursive: true })
      console.log('ipfs.pin.add result', pinResult)
      state.isPinned = true
      notify('notify_pinnedIpfsResourceTitle', currentPath)
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
      const ipfs = await getIpfsApi()
      const currentPath = await resolveToIPFS(ipfs, new URL(state.currentTab.url).pathname)
      const result = await ipfs.pin.rm(currentPath, {recursive: true})
      state.isPinned = false
      console.log('ipfs.pin.rm result', result)
      notify('notify_unpinnedIpfsResourceTitle', currentPath)
    } catch (error) {
      handlePinError('notify_unpinErrorTitle', error)
    }
    state.isUnPinning = false
    emitter.emit('render')
    window.close()
  })

  async function handlePinError (errorMessageKey, error) {
    console.error(browser.i18n.getMessage(errorMessageKey), error)
    try {
      notify(errorMessageKey, error.message)
    } catch (notifyError) {
      console.error('Unable to notify user about pin-related error', notifyError)
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
    state.gatewayAddress = '…'
    emitter.emit('render')

    try {
      await browser.storage.local.set({useCustomGateway: !enabled})
    } catch (error) {
      console.error(`Unable to update redirect state due to ${error}`)
      state.redirectEnabled = enabled
    }

    emitter.emit('render')
  })

  emitter.on('toggleNodeType', async () => {
    const prev = state.ipfsNodeType
    state.ipfsNodeType = prev === 'external' ? 'embedded' : 'external'
    emitter.emit('render')
    try {
      await browser.storage.local.set({ipfsNodeType: state.ipfsNodeType})
    } catch (error) {
      console.error(`Unable to update ipfs node type due to ${error}`)
      state.ipfsNodeType = prev
      emitter.emit('render')
    }
  })

  async function updatePageActionsState (status) {
    // IPFS contexts require access to ipfs API object from background page
    // Note: access to background page is denied in Private Browsing mode
    const ipfs = await getIpfsApi()

    // Check if current page is an IPFS one
    state.isIpfsContext = !!(ipfs && status && status.ipfsPageActionsContext)
    state.currentTab = status.currentTab || null

    if (state.isIpfsContext) {
      // browser.pageAction-specific items that can be rendered earlier (snappy UI)
      requestAnimationFrame(async () => {
        const tabId = state.currentTab ? {tabId: state.currentTab.id} : null
        if (browser.pageAction && tabId && await browser.pageAction.isShown(tabId)) {
          // Get title stored on page load so that valid transport is displayed
          // even if user toggles between public/custom gateway after the load
          state.pageActionTitle = await browser.pageAction.getTitle(tabId)
          emitter.emit('render')
        }
      })
      // There is no point in displaying actions that require API interaction if API is down
      const apiIsUp = status && status.peerCount >= 0
      if (apiIsUp) await updatePinnedState(ipfs, status)
    }
  }

  async function updateBrowserActionState (status) {
    if (status) {
      const options = await browser.storage.local.get()
      if (options.useCustomGateway && (options.ipfsNodeType !== 'embedded')) {
        state.gatewayAddress = options.customGatewayUrl
      } else {
        state.gatewayAddress = options.publicGatewayUrl
      }
      state.ipfsNodeType = status.ipfsNodeType
      state.ipfsApiUrl = options.ipfsApiUrl
      state.redirectEnabled = options.useCustomGateway
      state.swarmPeers = status.peerCount === -1 ? 0 : status.peerCount
      state.isIpfsOnline = status.peerCount > -1
      state.gatewayVersion = status.gatewayVersion ? status.gatewayVersion : null
    } else {
      state.ipfsNodeType = 'external'
      state.swarmPeers = null
      state.isIpfsOnline = false
      state.gatewayVersion = null
      state.isIpfsContext = false
    }
  }

  async function updatePinnedState (ipfs, status) {
    // skip update if there is an ongoing pin or unpin
    if (state.isPinning || state.isUnPinning) return
    try {
      const currentPath = await resolveToIPFS(ipfs, new URL(status.currentTab.url).pathname)
      const response = await ipfs.pin.ls(currentPath, {quiet: true})
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
    // console.log('Sending notification (' + title + '): ' + message + ')')
    return port.postMessage({event: 'notification', title: title, message: message})
  }
}

function getBackgroundPage () {
  return browser.runtime.getBackgroundPage()
}

async function getIpfsApi () {
  const bg = await getBackgroundPage()
  return (bg && bg.ipfsCompanion) ? bg.ipfsCompanion.ipfs : null
}

async function resolveToIPFS (ipfs, path) {
  path = safeIpfsPath(path) // https://github.com/ipfs/ipfs-companion/issues/303
  if (/^\/ipns/.test(path)) {
    const response = await ipfs.name.resolve(path, {recursive: true, nocache: false})
    return response.Path
  }
  return path
}
