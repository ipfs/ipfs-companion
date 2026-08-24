'use strict'

const stableChannels = new Set([
  'ipfs-firefox-addon@lidel.org', // firefox (for legacy reasons)
  'nibjojkomfdiaoajekhjakgkdhaomnch' // chromium (chrome web store)
])

const stableChannelForumUrl = 'https://discuss.ipfs.tech/c/help/13'

export function getUninstallURL (browser) {
  // the browser opens this page after an uninstall, so someone leaving lands
  // where they can ask for help or say what went wrong. Plain URL, no
  // identifiers, stable channel only.
  return stableChannels.has(browser.runtime.id) ? stableChannelForumUrl : ''
}
