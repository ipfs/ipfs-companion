'use strict'
/* eslint-env browser */

// TODO: this needs to be updated to new stable channel info on launch
// https://github.com/ipfs/ipfs-companion/issues/1069
const stableChannels = new Set([
  'ipfs-firefox-addon@lidel.org', // firefox (for legacy reasons)
  'nibjojkomfdiaoajekhjakgkdhaomnch' // chromium (chrome web store)
])

const stableChannelFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfLF7uzaxRKiF4XpPL9_DvkdaQHoRnDihRTZ1uVL6ceQwIrtg/viewform'

export function getUninstallURL (browser) {
  // on uninstall feedback form shown only on stable channel
  return stableChannels.has(browser.runtime.id) ? stableChannelFormUrl : ''
}
