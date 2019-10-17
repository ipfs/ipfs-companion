'use strict'
/* eslint-env browser */

const stableChannels = new Set([
  'ipfs-firefox-addon@lidel.org', // firefox (for legacy reasons)
  'nibjojkomfdiaoajekhjakgkdhaomnch' // chromium (chrome web store)
])

const stableChannelFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfLF7uzaxRKiF4XpPL9_DvkdaQHoRnDihRTZ1uVL6ceQwIrtg/viewform'

exports.getUninstallURL = (browser) => {
  // on uninstall feedback form shown only on stable channel
  return stableChannels.has(browser.runtime.id) ? stableChannelFormUrl : ''
}
