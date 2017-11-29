'use strict'

const browser = require('webextension-polyfill')
const { safeIpfsPath } = require('./ipfs-path')
const { findUrlForContext } = require('./context-menus')

async function copyTextToClipboard (copyText) {
  const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
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
  // We work around this limitation by injecting content scropt into a tab and copying there.
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

function createCopier (getState, notify) {
  return {
    async copyCanonicalAddress (context) {
      const url = await findUrlForContext(context)
      const rawIpfsAddress = safeIpfsPath(url)
      copyTextToClipboard(rawIpfsAddress)
      notify('notify_copiedCanonicalAddressTitle', rawIpfsAddress)
    },

    async copyAddressAtPublicGw (context) {
      const url = await findUrlForContext(context)
      const state = getState()
      const urlAtPubGw = url.replace(state.gwURLString, state.pubGwURLString)
      copyTextToClipboard(urlAtPubGw)
      notify('notify_copiedPublicURLTitle', urlAtPubGw)
    }
  }
}

module.exports = createCopier
