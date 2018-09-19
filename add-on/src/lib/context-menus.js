'use strict'

const browser = require('webextension-polyfill')

async function findUrlForContext (context, contextField) {
  if (context) {
    if (contextField) {
      return context[contextField]
    }
    if (context.srcUrl) {
      // present when clicked on page element such as image or video
      return context.srcUrl
    }
    if (context.linkUrl) {
      // present when clicked on a link
      return context.linkUrl
    }
    if (context.pageUrl) {
      // pageUrl is the root frame
      return context.pageUrl
    }
  }
  // falback to the url of current tab
  const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
  return currentTab.url
}

module.exports.findUrlForContext = findUrlForContext

const contextMenuAddToIpfsSelection = 'contextMenu_AddToIpfsSelection'
// const contextMenuAddToIpfsRawCid = 'contextMenu_AddToIpfsRawCid'
const contextMenuAddToIpfsImage = 'contextMenu_AddToIpfsImage'
const contextMenuAddToIpfsVideo = 'contextMenu_AddToIpfsVideo'
const contextMenuAddToIpfsAudio = 'contextMenu_AddToIpfsAudio'
const contextMenuAddToIpfsLink = 'contextMenu_AddToIpfsLink'
const contextMenuCopyCanonicalAddress = 'panelCopy_currentIpfsAddress'
const contextMenuCopyAddressAtPublicGw = 'panel_copyCurrentPublicGwUrl'

// menu items that are enabled only when API is online
const apiMenuItems = [
  contextMenuAddToIpfsSelection,
  contextMenuAddToIpfsImage,
  contextMenuAddToIpfsVideo,
  contextMenuAddToIpfsAudio,
  contextMenuAddToIpfsLink
]

function createContextMenus (getState, runtime, ipfsPathValidator, { onAddFromContext, onCopyCanonicalAddress, onCopyAddressAtPublicGw }) {
  let copyAddressContexts = ['page', 'image', 'video', 'audio', 'link']
  if (runtime.isFirefox) {
    // https://github.com/ipfs-shipyard/ipfs-companion/issues/398
    copyAddressContexts.push('page_action')
  }
  try {
    const createAddToIpfsMenuItem = (menuItemId, contextName, contextField, ipfsAddOptions) => {
      browser.contextMenus.create({
        id: menuItemId,
        title: browser.i18n.getMessage(menuItemId),
        contexts: [contextName],
        documentUrlPatterns: ['<all_urls>'],
        enabled: false,
        onclick: (context) => onAddFromContext(context, 'srcUrl', ipfsAddOptions)
      })
    }
    createAddToIpfsMenuItem(contextMenuAddToIpfsSelection, 'selection', 'selectionText')
    createAddToIpfsMenuItem(contextMenuAddToIpfsImage, 'image', 'srcUrl', { wrapWithDirectory: true })
    createAddToIpfsMenuItem(contextMenuAddToIpfsVideo, 'video', 'srcUrl', { wrapWithDirectory: true })
    createAddToIpfsMenuItem(contextMenuAddToIpfsAudio, 'audio', 'srcUrl', { wrapWithDirectory: true })
    createAddToIpfsMenuItem(contextMenuAddToIpfsLink, 'link', 'linkUrl', { wrapWithDirectory: true })

    browser.contextMenus.create({
      id: contextMenuCopyCanonicalAddress,
      title: browser.i18n.getMessage(contextMenuCopyCanonicalAddress),
      contexts: copyAddressContexts,
      documentUrlPatterns: ['*://*/ipfs/*', '*://*/ipns/*'],
      onclick: onCopyCanonicalAddress
    })

    browser.contextMenus.create({
      id: contextMenuCopyAddressAtPublicGw,
      title: browser.i18n.getMessage(contextMenuCopyAddressAtPublicGw),
      contexts: copyAddressContexts,
      documentUrlPatterns: ['*://*/ipfs/*', '*://*/ipns/*'],
      onclick: onCopyAddressAtPublicGw
    })
  } catch (err) {
    // documentUrlPatterns is not supported in Brave
    if (err.message.indexOf('createProperties.documentUrlPatterns of contextMenus.create is not supported yet') > -1) {
      console.warn('[ipfs-companion] Context menus disabled - createProperties.documentUrlPatterns of contextMenus.create is not supported yet')
      return { update: () => Promise.resolve() }
    }
    // contextMenus are not supported in Firefox for Android
    if (err.message === 'browser.contextMenus is undefined' || typeof browser.contextMenus === 'undefined') {
      console.warn('[ipfs-companion] Context menus disabled - browser.contextMenus is undefined')
      return { update: () => Promise.resolve() }
    }
    throw err
  }

  return {
    async update (changedTabId) {
      try {
        const canUpload = getState().peerCount > 0
        for (let item of apiMenuItems) {
          await browser.contextMenus.update(item, { enabled: canUpload })
        }
        if (changedTabId) {
          // recalculate tab-dependant menu items
          const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
          if (currentTab && currentTab.id === changedTabId) {
            const ipfsContext = ipfsPathValidator.isIpfsPageActionsContext(currentTab.url)
            browser.contextMenus.update(contextMenuCopyCanonicalAddress, { enabled: ipfsContext })
            browser.contextMenus.update(contextMenuCopyAddressAtPublicGw, { enabled: ipfsContext })
          }
        }
      } catch (err) {
        console.log('[ipfs-companion] Error updating context menus', err)
      }
    }

    // TODO: destroy?
  }
}

module.exports.createContextMenus = createContextMenus
