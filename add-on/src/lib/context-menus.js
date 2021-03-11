'use strict'

const browser = require('webextension-polyfill')

const debug = require('debug')
const log = debug('ipfs-companion:context-menus')
log.error = debug('ipfs-companion:context-menus:error')

// mapping between context name and field with data for it
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/ContextType
const contextSources = {
  selection: 'selectionText',
  image: 'srcUrl',
  video: 'srcUrl',
  audio: 'srcUrl',
  link: 'linkUrl',
  page: 'pageUrl'
}

async function findValueForContext (context, contextType) {
  if (context) {
    if (contextType) {
      const field = contextSources[contextType]
      return context[field]
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

module.exports.findValueForContext = findValueForContext

// Context Roots
const menuParentImage = 'contextMenu_parentImage'
const menuParentVideo = 'contextMenu_parentVideo'
const menuParentAudio = 'contextMenu_parentAudio'
const menuParentLink = 'contextMenu_parentLink'
const menuParentPage = 'contextMenu_parentPage'
// const menuParentText = 'contextMenu_parentText'
// Generic Add to IPFS
const contextMenuImportToIpfs = 'contextMenu_importToIpfs'
// Add X to IPFS
const contextMenuImportToIpfsSelection = 'contextMenu_importToIpfsSelection'
// Copy X
const contextMenuCopyCidAddress = 'panelCopy_currentIpfsAddress'
const contextMenuCopyCanonicalAddress = 'panelCopy_currentIpnsAddress'
const contextMenuCopyRawCid = 'panelCopy_copyRawCid'
const contextMenuCopyAddressAtPublicGw = 'panel_copyCurrentPublicGwUrl'
const contextMenuViewOnGateway = 'panel_contextMenuViewOnGateway'
const contextMenuCopyPermalink = 'panel_copyCurrentPermalink'
module.exports.contextMenuCopyCidAddress = contextMenuCopyCidAddress
module.exports.contextMenuCopyCanonicalAddress = contextMenuCopyCanonicalAddress
module.exports.contextMenuCopyRawCid = contextMenuCopyRawCid
module.exports.contextMenuCopyAddressAtPublicGw = contextMenuCopyAddressAtPublicGw
module.exports.contextMenuViewOnGateway = contextMenuViewOnGateway
module.exports.contextMenuCopyPermalink = contextMenuCopyPermalink

// menu item ids for things that are enabled only when API is online (static)
const apiMenuItemIds = new Set([contextMenuCopyRawCid, contextMenuCopyCanonicalAddress, contextMenuImportToIpfs])
// menu items that are enabled only when API is online (dynamic)
const apiMenuItems = new Set()
// menu items enabled only in IPFS context (dynamic)
const ipfsContextItems = new Set()

function createContextMenus (getState, runtime, ipfsPathValidator, { onAddFromContext, onCopyCanonicalAddress, onCopyRawCid, onCopyAddressAtPublicGw }) {
  try {
    const createSubmenu = (id, contextType, menuBuilder) => {
      browser.contextMenus.create({
        id,
        title: browser.i18n.getMessage(id),
        documentUrlPatterns: ['<all_urls>'],
        contexts: [contextType]
      })
    }
    const createImportToIpfsMenuItem = (parentId, id, contextType, ipfsAddOptions) => {
      const itemId = `${parentId}_${id}`
      apiMenuItems.add(itemId)
      return browser.contextMenus.create({
        id: itemId,
        parentId,
        title: browser.i18n.getMessage(id),
        contexts: [contextType],
        documentUrlPatterns: ['<all_urls>'],
        enabled: false,
        /* no support for 'icons' in Chrome
        icons: {
          '48': '/ui-kit/icons/stroke_cube.svg'
        }, */
        onclick: (context) => onAddFromContext(context, contextType, ipfsAddOptions)
      })
    }
    const createCopierMenuItem = (parentId, id, contextType, handler) => {
      const itemId = `${parentId}_${id}`
      ipfsContextItems.add(itemId)
      // some items also require API access
      if (apiMenuItemIds.has(id)) {
        apiMenuItems.add(itemId)
      }
      return browser.contextMenus.create({
        id: itemId,
        parentId,
        title: browser.i18n.getMessage(id),
        contexts: [contextType],
        documentUrlPatterns: [
          '*://*/ipfs/*', '*://*/ipns/*',
          '*://*.ipfs.dweb.link/*', '*://*.ipns.dweb.link/*', // TODO: add any custom public gateway from Preferences
          '*://*.ipfs.localhost/*', '*://*.ipns.localhost/*'
        ],
        /* no support for 'icons' in Chrome
        icons: {
          '48': '/ui-kit/icons/stroke_copy.svg'
        }, */
        onclick: (context) => handler(context, contextType)
      })
    }
    const buildSubmenu = (parentId, contextType) => {
      createSubmenu(parentId, contextType)
      createImportToIpfsMenuItem(parentId, contextMenuImportToIpfs, contextType, { wrapWithDirectory: true, pin: false })
      createCopierMenuItem(parentId, contextMenuCopyAddressAtPublicGw, contextType, onCopyAddressAtPublicGw)
      // TODO: below needs refactor to support for both IPFS and IPNS, like one added to browser action in https://github.com/ipfs-shipyard/ipfs-companion/pull/937
      // createCopierMenuItem(parentId, contextMenuCopyCanonicalAddress, contextType, onCopyCanonicalAddress)
      createCopierMenuItem(parentId, contextMenuCopyRawCid, contextType, onCopyRawCid)
    }

    /*
    createSubmenu(menuParentText, 'selection')
    createImportToIpfsMenuItem(menuParentText, contextMenuImportToIpfsSelection, 'selection')
    */
    createImportToIpfsMenuItem(null, contextMenuImportToIpfsSelection, 'selection', { pin: false })
    buildSubmenu(menuParentImage, 'image')
    buildSubmenu(menuParentVideo, 'video')
    buildSubmenu(menuParentAudio, 'audio')
    buildSubmenu(menuParentLink, 'link')
    buildSubmenu(menuParentPage, 'page')
  } catch (err) {
    // documentUrlPatterns is not supported in Muon-Brave
    if (err.message.indexOf('createProperties.documentUrlPatterns of contextMenus.create is not supported yet') > -1) {
      log('context menus disabled - createProperties.documentUrlPatterns of contextMenus.create is not supported yet')
      return { update: () => Promise.resolve() }
    }
    // contextMenus are not supported in Firefox for Android
    if (err.message === 'browser.contextMenus is undefined' || typeof browser.contextMenus === 'undefined') {
      log('context menus disabled - browser.contextMenus is undefined')
      return { update: () => Promise.resolve() }
    }
    throw err
  }

  // enabled only when ipfsContext is shown when API is up
  const apiAndIpfsContextItems = new Set([...apiMenuItems].filter(i => ipfsContextItems.has(i)))
  // state to avoid async tab lookups
  let ipfsContext = false

  return {
    async update (changedTabId) {
      try {
        if (changedTabId) {
          // recalculate tab-dependant menu items
          const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
          if (currentTab && currentTab.id === changedTabId) {
            ipfsContext = ipfsPathValidator.isIpfsPageActionsContext(currentTab.url)
          }
        }
        const ifApi = getState().peerCount >= 0
        for (const item of apiMenuItems) {
          await browser.contextMenus.update(item, { enabled: ifApi })
        }
        for (const item of ipfsContextItems) {
          await browser.contextMenus.update(item, { enabled: ipfsContext })
        }
        for (const item of apiAndIpfsContextItems) {
          await browser.contextMenus.update(item, { enabled: (ifApi && ipfsContext) })
        }
      } catch (err) {
        log.error('Error updating context menus', err)
      }
    }

    // TODO: destroy?
  }
}

module.exports.createContextMenus = createContextMenus
