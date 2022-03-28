import browser from "webextension-polyfill";

// import { findValueForContext } from './context-menus'

// mapping between context name and field with data for it
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/menus/ContextType
const contextSources = {
  selection: "selectionText",
  image: "srcUrl",
  video: "srcUrl",
  audio: "srcUrl",
  link: "linkUrl",
  page: "pageUrl",
};

async function findValueForContext(context, contextType) {
  if (context) {
    if (contextType) {
      const field = contextSources[contextType];
      return context[field];
    }
    if (context.srcUrl) {
      // present when clicked on page element such as image or video
      return context.srcUrl;
    }
    if (context.linkUrl) {
      // present when clicked on a link
      return context.linkUrl;
    }
    if (context.pageUrl) {
      // pageUrl is the root frame
      return context.pageUrl;
    }
  }
  // fallback to the url of current tab
  const currentTab = await browser.tabs
    .query({
      active: true,
      // , currentWindow: true
    })
    .then((tabs) => tabs[0]);
  return currentTab.url;
}

async function copyTextToClipboard(text, notify) {
  try {
    try {
      // Modern API (spotty support, but works in Firefox)
      await navigator.clipboard.writeText(text);
      // FUN FACT:
      // Before this API existed we had no access to clipboard from
      // the background page in Firefox and had to inject content script
      // into current page to copy there:
      // https://github.com/ipfs-shipyard/ipfs-companion/blob/b4a168880df95718e15e57dace6d5006d58e7f30/add-on/src/lib/copier.js#L10-L35
      // :-))
    } catch (e) {
      // Fallback to old API (works only in Chromium)
      // eslint-disable-next-line no-inner-declarations
      function oncopy(event) {
        // eslint-disable-line no-inner-declarations
        document.removeEventListener("copy", oncopy, true);
        event.stopImmediatePropagation();
        event.preventDefault();
        event.clipboardData.setData("text/plain", text);
      }
      document.addEventListener("copy", oncopy, true);
      document.execCommand("copy");
    }
    notify("notify_copiedTitle", text);
  } catch (error) {
    console.error("[ipfs-companion] Failed to copy text", error);
    notify("notify_addonIssueTitle", "Unable to copy");
  }
}

export default function createCopier(notify, ipfsPathValidator) {
  return {
    async copyTextToClipboard(text) {
      await copyTextToClipboard(text, notify);
    },

    async copyCanonicalAddress(context, contextType) {
      const url = await findValueForContext(context, contextType);
      const ipfsPath = ipfsPathValidator.resolveToIpfsPath(url);
      await copyTextToClipboard(ipfsPath, notify);
    },

    async copyCidAddress(context, contextType) {
      console.log("copyCidAddress: ", context, contextType);
      const url = await findValueForContext(context, contextType);
      const ipfsPath = await ipfsPathValidator.resolveToImmutableIpfsPath(url);
      await copyTextToClipboard(ipfsPath, notify);
    },

    async copyRawCid(context, contextType) {
      const url = await findValueForContext(context, contextType);
      try {
        const cid = await ipfsPathValidator.resolveToCid(url);
        await copyTextToClipboard(cid, notify);
      } catch (error) {
        console.error("Unable to resolve/copy direct CID:", error.message);
        if (notify) {
          const errMsg = error.toString();
          if (errMsg.startsWith("Error: no link")) {
            // Sharding support is limited:
            // - https://github.com/ipfs/js-ipfs/issues/1279
            // - https://github.com/ipfs/go-ipfs/issues/5270
            notify(
              "notify_addonIssueTitle",
              "Unable to resolve CID within HAMT-sharded directory, sorry! Will be fixed soon."
            );
          } else {
            notify(
              "notify_addonIssueTitle",
              "notify_inlineErrorMsg",
              error.message
            );
          }
        }
      }
    },

    async copyAddressAtPublicGw(context, contextType) {
      const url = await findValueForContext(context, contextType);
      const publicUrl = ipfsPathValidator.resolveToPublicUrl(url);
      await copyTextToClipboard(publicUrl, notify);
    },

    async copyPermalink(context, contextType) {
      console.log("copyPermalink: ", context, contextType);
      const url = await findValueForContext(context, contextType);
      const permalink = await ipfsPathValidator.resolveToPermalink(url);
      await copyTextToClipboard(permalink, notify);
    },
  };
}
