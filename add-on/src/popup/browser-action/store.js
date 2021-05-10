'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const isIPFS = require('is-ipfs')
const { browserActionFilesCpImportCurrentTab } = require('../../lib/ipfs-import')
const { ipfsContentPath } = require('../../lib/ipfs-path')
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

  emitter.on('filesCpImport', () => {
    port.postMessage({ event: browserActionFilesCpImportCurrentTab })
    window.close()
  })

  emitter.on('quickImport', () => {
    browser.tabs.create({ url: browser.runtime.getURL('dist/popup/quick-import.html') })
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
        browser.tabs.create({ url: browser.runtime.getURL(optionsPage) })
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
}

function getBackgroundPage () {
  return browser.runtime.getBackgroundPage()
}
