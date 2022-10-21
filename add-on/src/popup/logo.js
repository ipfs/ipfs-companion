'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'
import { braveNodeType } from '../lib/ipfs-client/brave.js'

function logoFileName(nodeType, isIpfsOnline) {
  let prefix
  if (nodeType.startsWith('embedded')) prefix = 'js-'
  if (nodeType === braveNodeType) prefix = 'brave-'
  return `${prefix || ''}ipfs-logo-${isIpfsOnline ? 'on' : 'off'}.svg`
}

export default function logo({
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
