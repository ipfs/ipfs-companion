import browser from 'webextension-polyfill'

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
  // fallback to the url of current tab
  const currentTab = await browser.tabs.query({
    active: true
    // , currentWindow: true
  }).then(tabs => tabs[0])
  return currentTab.url
}

export default function createURLNormalizer (notify, ipfsPathValidator) {
  return {
    async getCanonicalAddress (context, contextType) {
      const url = await findValueForContext(context, contextType)
      return ipfsPathValidator.resolveToIpfsPath(url)
    },

    async getCidAddress (context, contextType) {
      const url = await findValueForContext(context, contextType)
      return await ipfsPathValidator.resolveToImmutableIpfsPath(url)
    },

    async getRawCid (context, contextType) {
      const url = await findValueForContext(context, contextType)
      try {
        return await ipfsPathValidator.resolveToCid(url)
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

    async getAddressAtPublicGw (context, contextType) {
      const url = await findValueForContext(context, contextType)
      return ipfsPathValidator.resolveToPublicUrl(url)
    },

    async getPermalink (context, contextType) {
      const url = await findValueForContext(context, contextType)
      return await ipfsPathValidator.resolveToPermalink(url)
    }
  }
}
