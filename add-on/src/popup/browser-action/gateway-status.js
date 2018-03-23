'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function gatewayStatus ({
  ipfsApiUrl,
  publicGatewayUrl,
  gatewayAddress,
  gatewayVersion,
  swarmPeers,
  isIpfsOnline,
  ipfsNodeType,
  redirectEnabled
}) {
  const api = ipfsNodeType === 'embedded' ? 'js-ipfs' : ipfsApiUrl
  return html`
    <ul class="fade-in list mv3 ph3 bg-white black">
      <li class="flex mb2">
        <span class="w-40 f7 ttu">${browser.i18n.getMessage('panel_statusGatewayAddress')}</span>
        <code class="w-60 f7 tr">${gatewayAddress == null ? 'unknown' : gatewayAddress}</code>
      </li>
      <li class="flex mb2">
        <span class="w-40 f7 ttu">${browser.i18n.getMessage('panel_statusApiAddress')}</span>
        <code class="w-60 f7 tr">${api}</code>
      </li>
      <li class="flex mb2">
        <span class="w-40 f7 ttu">${browser.i18n.getMessage('panel_statusGatewayVersion')}</span>
        <code class="w-60 f7 tr">${gatewayVersion == null ? 'offline' : gatewayVersion}</code>
      </li>
      <li class="flex mb2" title="${browser.i18n.getMessage('panel_statusSwarmPeersTitle')}">
        <span class="w-40 f7 ttu">${browser.i18n.getMessage('panel_statusSwarmPeers')}</span>
        <code class="w-60 f7 tr fw9">${swarmPeers == null ? 'offline' : swarmPeers}</code>
      </li>
    </ul>
  `
}
