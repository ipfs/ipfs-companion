'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const isIPFS = require('is-ipfs')
const all = require('it-all')
const { trimHashAndSearch, ipfsContentPath } = require('../../lib/ipfs-path')
const { welcomePage, optionsPage } = require('../../lib/constants')
const { contextMenuViewOnGateway, contextMenuCopyAddressAtPublicGw, contextMenuCopyPermalink, contextMenuCopyRawCid, contextMenuCopyCanonicalAddress, contextMenuCopyCidAddress } = require('../../lib/context-menus')

// The store contains and mutates the state for the app
module.exports = (state, emitter) => {
  Object.assign(state, {
    // Global toggles
    active: true,
    redirect: true,
    // UI contexts
    isIpfsContext: false, // Active Tab represents IPFS resource
    isRedirectContext: false, // Active Tab or its subresources could be redirected
    isPinning: false,
    isUnPinning: false,
    isPinned: false,
    // IPFS details
    ipfsNodeType: 'external',
    isIpfsOnline: false,
    ipfsApiUrl: null,
    publicGatewayUrl: null,
    publicSubdomainGatewayUrl: null,
    gatewayAddress: null,
    swarmPeers: null,
    gatewayVersion: null,
    isApiAvailable: false,
    // isRedirectContext
    currentTab: null,
    currentFqdn: null,
    currentDnslinkFqdn: null,
    enabledOn: [],
    disabledOn: []
  })

  let port

  emitter.on('DOMContentLoaded', async () => {
    // initial render with status stub
    emitter.emit('render')
    // initialize connection to the background script which will trigger UI updates
    port = browser.runtime.connect({ name: 'browser-action-port' })
    port.onMessage.addListener(async (message) => {
      if (message.statusUpdate) {
        const status = message.statusUpdate
        console.log('In browser action, received message from background:', message)
        await updateBrowserActionState(status)
        emitter.emit('render')
        if (status.isIpfsContext) {
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

  emitter.on('viewOnGateway', async () => {
    port.postMessage({ event: contextMenuViewOnGateway })
    window.close()
  })

  emitter.on('copy', function (copyAction) {
    switch (copyAction) {
      case contextMenuCopyCanonicalAddress:
        port.postMessage({ event: contextMenuCopyCanonicalAddress })
        break
      case contextMenuCopyCidAddress:
        port.postMessage({ event: contextMenuCopyCidAddress })
        break
      case contextMenuCopyRawCid:
        port.postMessage({ event: contextMenuCopyRawCid })
        break
      case contextMenuCopyAddressAtPublicGw:
        port.postMessage({ event: contextMenuCopyAddressAtPublicGw })
        break
      case contextMenuCopyPermalink:
        port.postMessage({ event: contextMenuCopyPermalink })
        break
    }
    window.close()
  })

  emitter.on('pin', async function pinCurrentResource () {
    state.isPinning = true
    emitter.emit('render')

    try {
      const ipfs = await getIpfsApi()
      const currentPath = await resolveToPinPath(ipfs, state.currentTab.url)
      const pinResult = await ipfs.pin.add(currentPath, { recursive: true })
      console.log('ipfs.pin.add result', pinResult)
      state.isPinned = true
      notify('notify_pinnedIpfsResourceTitle', currentPath)
    } catch (error) {
      handlePinError('notify_pinErrorTitle', error)
    }
    state.isPinning = false
    emitter.emit('render')
  })

  emitter.on('unPin', async function unPinCurrentResource () {
    state.isUnPinning = true
    emitter.emit('render')

    try {
      const ipfs = await getIpfsApi()
      const currentPath = await resolveToPinPath(ipfs, state.currentTab.url)
      const result = await ipfs.pin.rm(currentPath, { recursive: true })
      state.isPinned = false
      console.log('ipfs.pin.rm result', result)
      notify('notify_unpinnedIpfsResourceTitle', currentPath)
    } catch (error) {
      handlePinError('notify_unpinErrorTitle', error)
    }
    state.isUnPinning = false
    emitter.emit('render')
  })

  async function handlePinError (errorMessageKey, error) {
    console.error(browser.i18n.getMessage(errorMessageKey), error)
    try {
      notify(errorMessageKey, error.message)
    } catch (notifyError) {
      console.error('Unable to notify user about pin-related error', notifyError)
    }
  }

  emitter.on('quickImport', () => {
    browser.tabs.create({ url: browser.extension.getURL('dist/popup/quick-import.html') })
    window.close()
  })

  emitter.on('openWelcomePage', async () => {
    try {
      await browser.tabs.create({ url: welcomePage })
      window.close()
    } catch (error) {
      console.error(`Unable Open WelcomePage (${welcomePage})`, error)
    }
  })

  emitter.on('openWebUi', async (page = '/') => {
    const url = `${state.webuiRootUrl}#${page}`
    try {
      await browser.tabs.create({ url })
      window.close()
    } catch (error) {
      console.error(`Unable Open Web UI (${url})`, error)
    }
  })

  emitter.on('openReleaseNotes', async () => {
    const { version } = browser.runtime.getManifest()
    const stableChannel = version.match(/\./g).length === 2
    let url
    try {
      if (stableChannel) {
        url = `https://github.com/ipfs-shipyard/ipfs-companion/releases/tag/v${version}`
        await browser.storage.local.set({ dismissedUpdate: version })
      } else {
        // swap URL and do not dismiss
        url = 'https://github.com/ipfs-shipyard/ipfs-companion/issues/964'
      }
      // Note: opening tab needs to happen after storage.local.set because in Chromium 86
      // it triggers a premature window.close, which aborts storage update
      await browser.tabs.create({ url })
      window.close()
    } catch (error) {
      console.error(`Unable to open release notes (${url})`, error)
    }
  })

  emitter.on('openPrefs', () => {
    browser.runtime.openOptionsPage()
      .then(() => window.close())
      .catch((err) => {
        console.error('runtime.openOptionsPage() failed, opening options page in tab instead.', err)
        // brave: fallback to opening options page as a tab.
        browser.tabs.create({ url: browser.extension.getURL(optionsPage) })
      })
  })

  emitter.on('toggleGlobalRedirect', async () => {
    const redirectEnabled = state.redirect
    state.redirect = !redirectEnabled
    state.gatewayAddress = state.redirect ? state.gwURLString : state.pubGwURLString
    emitter.emit('render')
    try {
      await browser.storage.local.set({ useCustomGateway: !redirectEnabled })
    } catch (error) {
      console.error(`Unable to update redirect state due to ${error}`)
      state.redirect = redirectEnabled
      emitter.emit('render')
    }
  })

  emitter.on('toggleSiteIntegrations', async () => {
    const wasOptedOut = state.currentTabIntegrationsOptOut
    state.currentTabIntegrationsOptOut = !wasOptedOut
    emitter.emit('render')

    try {
      let { enabledOn, disabledOn, currentTab, currentDnslinkFqdn, currentFqdn } = state
      // if we are on /ipns/fqdn.tld/ then use hostname from DNSLink
      const fqdn = currentDnslinkFqdn || currentFqdn
      if (wasOptedOut) {
        disabledOn = disabledOn.filter(host => host !== fqdn)
        enabledOn.push(fqdn)
      } else {
        enabledOn = enabledOn.filter(host => host !== fqdn)
        disabledOn.push(fqdn)
      }
      // console.dir('toggleSiteIntegrations', state)
      await browser.storage.local.set({ disabledOn, enabledOn })

      const path = ipfsContentPath(currentTab.url, { keepURIParams: true })
      // Reload the current tab to apply updated redirect preference
      if (!currentDnslinkFqdn || !isIPFS.ipnsPath(path)) {
        // No DNSLink, reload URL as-is
        await browser.tabs.reload(currentTab.id)
      } else {
        // DNSLinked websites require URL change
        // from  http?://gateway.tld/ipns/{fqdn}/some/path OR
        // from  http?://{fqdn}.ipns.gateway.tld/some/path
        // to    http://{fqdn}/some/path
        // (defaulting to http: https websites will have HSTS or a redirect)
        const originalUrl = path.replace(/^.*\/ipns\//, 'http://')
        await browser.tabs.update(currentTab.id, {
          // FF only: loadReplace: true,
          url: originalUrl
        })
      }
    } catch (error) {
      console.error(`Unable to update integrations state due to ${error}`)
      emitter.emit('render')
    }
  })

  emitter.on('toggleActive', async () => {
    const prev = state.active
    state.active = !prev
    if (!state.active) {
      state.gatewayAddress = state.pubGwURLString
      state.ipfsApiUrl = null
      state.gatewayVersion = null
      state.swarmPeers = null
      state.isIpfsOnline = false
    }
    try {
      await browser.storage.local.set({ active: state.active })
    } catch (error) {
      console.error(`Unable to update global Active flag due to ${error}`)
      state.active = prev
    }
    emitter.emit('render')
  })

  async function updatePageActionsState (status) {
    // browser.pageAction-specific items that can be rendered earlier (snappy UI)
    requestAnimationFrame(async () => {
      const tabId = state.currentTab ? { tabId: state.currentTab.id } : null
      if (browser.pageAction && tabId && await browser.pageAction.isShown(tabId)) {
        // Get title stored on page load so that valid transport is displayed
        // even if user toggles between public/custom gateway after the load
        state.pageActionTitle = await browser.pageAction.getTitle(tabId)
        emitter.emit('render')
      }
    })

    if (state.isIpfsContext) {
      // IPFS contexts require access to ipfs API object from background page
      // Note: access to background page will be denied in Private Browsing mode
      const ipfs = await getIpfsApi()
      // There is no point in displaying actions that require API interaction if API is down
      const apiIsUp = ipfs && status && status.peerCount >= 0
      if (apiIsUp) await updatePinnedState(ipfs, status)
    }
  }

  async function updateBrowserActionState (status) {
    if (status) {
      // Copy all attributes
      Object.assign(state, status)

      if (state.active && status.redirect && (status.ipfsNodeType !== 'embedded')) {
        state.gatewayAddress = status.gwURLString
      } else {
        state.gatewayAddress = status.pubGwURLString
      }
      // Import requires access to the background page (https://github.com/ipfs-shipyard/ipfs-companion/issues/477)
      state.isApiAvailable = state.active && !!(await getBackgroundPage()) && !browser.extension.inIncognitoContext // https://github.com/ipfs-shipyard/ipfs-companion/issues/243
      state.swarmPeers = !state.active || status.peerCount === -1 ? null : status.peerCount
      state.isIpfsOnline = state.active && status.peerCount > -1
      state.gatewayVersion = state.active && status.gatewayVersion ? status.gatewayVersion : null
      state.ipfsApiUrl = state.active ? status.apiURLString : null
    } else {
      state.ipfsNodeType = 'external'
      state.swarmPeers = null
      state.isIpfsOnline = false
      state.gatewayVersion = null
      state.isIpfsContext = false
      state.isRedirectContext = false
    }
  }

  async function updatePinnedState (ipfs, status) {
    // skip update if there is an ongoing pin or unpin
    if (state.isPinning || state.isUnPinning) return
    try {
      const currentPath = await resolveToPinPath(ipfs, status.currentTab.url)
      const response = await all(ipfs.pin.ls({ paths: [currentPath], type: 'recursive' }))
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
    return port.postMessage({ event: 'notification', title: title, message: message })
  }
}

function getBackgroundPage () {
  return browser.runtime.getBackgroundPage()
}

async function getIpfsApi () {
  const bg = await getBackgroundPage()
  return (bg && bg.ipfsCompanion) ? bg.ipfsCompanion.ipfs : null
}

async function getIpfsPathValidator () {
  const bg = await getBackgroundPage()
  return (bg && bg.ipfsCompanion) ? bg.ipfsCompanion.ipfsPathValidator : null
}

async function resolveToPinPath (ipfs, url) {
  // Prior issues:
  // https://github.com/ipfs-shipyard/ipfs-companion/issues/567
  // https://github.com/ipfs/ipfs-companion/issues/303
  const pathValidator = await getIpfsPathValidator()
  const pinPath = trimHashAndSearch(await pathValidator.resolveToImmutableIpfsPath(url))
  return pinPath
}
