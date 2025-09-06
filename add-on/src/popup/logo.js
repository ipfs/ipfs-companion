'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'

function logoFileName (nodeType, isIpfsOnline) {
  return `ipfs-logo-${isIpfsOnline ? 'on' : 'off'}.svg`
}

export default function logo ({
  heartbeat = true,
  ipfsNodeType = 'external',
  isIpfsOnline = true,
  path,
  size = 52
}) {
  return html`
    <img
      alt="IPFS"
      src="${path}/${logoFileName(ipfsNodeType, isIpfsOnline)}"
      class="v-mid ${isIpfsOnline ? '' : 'o-40'} ${isIpfsOnline && heartbeat ? 'heartbeat' : ''}"
      style="width:${size}px; height:${size}px" />
  `
}
