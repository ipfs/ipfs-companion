'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const { braveNodeType } = require('../lib/ipfs-client/brave')

function logo ({ path, size = 52, ipfsNodeType = 'external', isIpfsOnline = true, heartbeat = true }) {
  return html`
    <img
      alt="IPFS"
      src="${path}/${logoFileName(ipfsNodeType, isIpfsOnline)}"
      class="v-mid ${isIpfsOnline ? '' : 'o-40'} ${isIpfsOnline && heartbeat ? 'heartbeat' : ''}"
      style="width:${size}px; height:${size}px" />
  `
}

function logoFileName (nodeType, isIpfsOnline) {
  let prefix
  if (nodeType.startsWith('embedded')) prefix = 'js-'
  if (nodeType === braveNodeType) prefix = 'brave-'
  return `${prefix || ''}ipfs-logo-${isIpfsOnline ? 'on' : 'off'}.svg`
}

module.exports = logo
