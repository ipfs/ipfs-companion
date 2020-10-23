'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function logo ({ path, size = 52, ipfsNodeType = 'external', apiAvailable = true, heartbeat = true }) {
  const logoTypePrefix = ipfsNodeType.startsWith('embedded') ? 'js-' : ''
  const logoFileName = `${logoTypePrefix}ipfs-logo-${apiAvailable ? 'on' : 'off'}.svg`
  return html`
    <img
      alt="IPFS"
      src="${path}/${logoFileName}"
      class="v-mid ${apiAvailable ? '' : 'o-40'} ${apiAvailable && heartbeat ? 'heartbeat' : ''}"
      style="width:${size}px; height:${size}px" />
  `
}

module.exports = logo
