'use strict'

import browser from 'webextension-polyfill'
import { findValueForContext } from './context-menus.js'

/**
 * Writes text to the clipboard.
 *
 * @param {string} text
 */
async function writeToClipboard (text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // This can happen if the user denies clipboard permissions.
    // or the current page is not allowed to access the clipboard.
    // no need to log this error, as it is expected in some cases.
    return false
  }
}

/**
 * Gets the current active tab.
 *
 * @returns {Promise<tabs.Tab>}
 */
async function getCurrentTab () {
  const queryOptions = { active: true, lastFocusedWindow: true }
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  const [tab] = await browser.tabs.query(queryOptions)
  return tab
}

/**
 * This is the MV3 version of copyTextToClipboard. It uses executeScript to run a function
 * in the context of the current tab. This is necessary because the clipboard API is not
 * available in the background script.
 *
 * Manifest Perms: "scripting", "activeTab"
 *
 * See: https://developer.chrome.com/docs/extensions/reference/scripting/
 *
 * @param {string} text
 */
async function copyTextToClipboardFromCurrentTab (text) {
  const tab = await getCurrentTab()
  if (!tab) {
    throw new Error('Unable to get current tab')
  }

  const [{ result }] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: writeToClipboard,
    args: [text]
  })

  if (!result) {
    throw new Error('Unable to write to clipboard')
  }
}

async function copyTextToClipboard (text, notify) {
  try {
    if (typeof navigator.clipboard !== 'undefined') { // Firefox
      await writeToClipboard(text)
    } else {
      await copyTextToClipboardFromCurrentTab(text)
    }
    notify('notify_copiedTitle', text)
  } catch (error) {
    console.error('[ipfs-companion] Failed to copy text', error)
    notify('notify_addonIssueTitle', 'Unable to copy')
  }
}

export default function createCopier (notify, ipfsPathValidator) {
  return {
    async copyTextToClipboard (text) {
      await copyTextToClipboard(text, notify)
    },

    async copyCanonicalAddress (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const ipfsPath = ipfsPathValidator.resolveToIpfsPath(url)
      await copyTextToClipboard(ipfsPath, notify)
    },

    async copyCidAddress (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const ipfsPath = await ipfsPathValidator.resolveToImmutableIpfsPath(url)
      await copyTextToClipboard(ipfsPath, notify)
    },

    async copyRawCid (context, contextType) {
      const url = await findValueForContext(context, contextType)
      try {
        const cid = await ipfsPathValidator.resolveToCid(url)
        await copyTextToClipboard(cid, notify)
      } catch (error) {
        console.error('Unable to resolve/copy direct CID:', error.message)
        if (notify) {
          const errMsg = error.toString()
          if (errMsg.startsWith('Error: no link')) {
            // Sharding support is limited:
            // - https://github.com/ipfs/js-ipfs/issues/1279
            // - https://github.com/ipfs/go-ipfs/issues/5270
            notify('notify_addonIssueTitle', 'Unable to resolve CID within HAMT-sharded directory, sorry! Will be fixed soon.')
          } else {
            notify('notify_addonIssueTitle', 'notify_inlineErrorMsg', error.message)
          }
        }
      }
    },

    async copyAddressAtPublicGw (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const publicUrl = await ipfsPathValidator.resolveToPublicUrl(url)
      await copyTextToClipboard(publicUrl, notify)
    },

    async copyPermalink (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const permalink = await ipfsPathValidator.resolveToPermalink(url)
      await copyTextToClipboard(permalink, notify)
    }
  }
}
