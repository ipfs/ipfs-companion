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
    <ul class="fade-in list mv0 pv2 ph3 white">
      <li class="flex mb1">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusGatewayAddress')}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all" title="${gatewayAddress}">${gatewayAddress == null ? 'unknown' : gatewayAddress}</span>
      </li>
      <li class="flex mb1">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusApiAddress')}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all" title="${api}">${api}</span>
      </li>
      <li class="flex mb1">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusGatewayVersion')}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all">${gatewayVersion == null ? 'offline' : gatewayVersion}</span>
      </li>
      <li class="flex" title="${browser.i18n.getMessage('panel_statusSwarmPeersTitle')}">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusSwarmPeers')}</span>
        <span class="w-60 f7 tr fw9 monospace truncate force-select-all">${swarmPeers == null ? 'offline' : swarmPeers}</span>
      </li>
    </ul>
  `
}
