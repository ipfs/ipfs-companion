'use strict'

const browser = require('webextension-polyfill')
const { safeIpfsPath, trimHashAndSearch } = require('./ipfs-path')
const { findValueForContext } = require('./context-menus')

async function copyTextToClipboard (copyText) {
  const currentTab = await browser.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0])
  const tabId = currentTab.id
  // Lets take a moment and ponder on the state of copying a string in 2017:
  const copyToClipboardIn2017 = `function copyToClipboardIn2017(text) {
      function oncopy(event) {
          document.removeEventListener('copy', oncopy, true);
          event.stopImmediatePropagation();
          event.preventDefault();
          event.clipboardData.setData('text/plain', text);
      }
      document.addEventListener('copy', oncopy, true);
      document.execCommand('copy');
    }`

  // In Firefox you can't select text or focus an input field in background pages,
  // so you can't write to the clipboard from a background page.
  // We work around this limitation by injecting content script into a tab and copying there.
  // Yes, this is 2017.
  try {
    const copyHelperPresent = (await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: "typeof copyToClipboardIn2017 === 'function';" }))[0]
    if (!copyHelperPresent) {
      await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: copyToClipboardIn2017 })
    }
    await browser.tabs.executeScript(tabId, { runAt: 'document_start', code: 'copyToClipboardIn2017(' + JSON.stringify(copyText) + ');' })
  } catch (error) {
    console.error('Failed to copy text: ' + error)
  }
}

function createCopier (getState, getIpfs, notify) {
  return {
    async copyCanonicalAddress (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const rawIpfsAddress = safeIpfsPath(url)
      copyTextToClipboard(rawIpfsAddress)
      notify('notify_copiedTitle', rawIpfsAddress)
    },

    async copyRawCid (context, contextType) {
      try {
        const ipfs = getIpfs()
        const url = await findValueForContext(context, contextType)
        const rawIpfsAddress = trimHashAndSearch(safeIpfsPath(url))
        const directCid = (await ipfs.resolve(rawIpfsAddress, { recursive: true, dhtt: '5s', dhtrc: 1 })).split('/')[2]
        copyTextToClipboard(directCid)
        notify('notify_copiedTitle', directCid)
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
      const state = getState()
      const urlAtPubGw = url.replace(state.gwURLString, state.pubGwURLString)
      copyTextToClipboard(urlAtPubGw)
      notify('notify_copiedTitle', urlAtPubGw)
    }
  }
}

module.exports = createCopier
