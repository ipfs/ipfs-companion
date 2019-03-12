'use strict'

const { findValueForContext } = require('./context-menus')

async function copyTextToClipboard (text, notify) {
  try {
    try {
      // Modern API (spotty support, but works in Firefox)
      await navigator.clipboard.writeText(text)
      // FUN FACT:
      // Before this API existed we had no access to cliboard from
      // the background page in Firefox and had to inject content script
      // into current page to copy there:
      // https://github.com/ipfs-shipyard/ipfs-companion/blob/b4a168880df95718e15e57dace6d5006d58e7f30/add-on/src/lib/copier.js#L10-L35
      // :-))
    } catch (e) {
      // Fallback to old API (works only in Chromium)
      function oncopy (event) { // eslint-disable-line no-inner-declarations
        document.removeEventListener('copy', oncopy, true)
        event.stopImmediatePropagation()
        event.preventDefault()
        event.clipboardData.setData('text/plain', text)
      }
      document.addEventListener('copy', oncopy, true)
      document.execCommand('copy')
    }
    notify('notify_copiedTitle', text)
  } catch (error) {
    console.error('[ipfs-companion] Failed to copy text', error)
    notify('notify_addonIssueTitle', 'Unable to copy')
  }
}

function createCopier (notify, ipfsPathValidator) {
  return {
    async copyCanonicalAddress (context, contextType) {
      const url = await findValueForContext(context, contextType)
      const ipfsPath = ipfsPathValidator.resolveToIpfsPath(url)
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
      const publicUrl = ipfsPathValidator.resolveToPublicUrl(url)
      await copyTextToClipboard(publicUrl, notify)
    }
  }
}

module.exports = createCopier
