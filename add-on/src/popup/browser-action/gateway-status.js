'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function gatewayStatus ({
  ipfsApiUrl,
  gatewayAddress,
  gatewayVersion,
  swarmPeers,
  isIpfsOnline,
  ipfsNodeType,
  redirectEnabled
}) {
  const api = ipfsApiUrl && ipfsNodeType === 'embedded' ? 'js-ipfs' : ipfsApiUrl
  const offline = browser.i18n.getMessage('panel_statusOffline')
  return html`
    <ul class="fade-in list mv0 pv2 ph3 white">
      <li class="flex mb1">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusGatewayAddress')}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all" title="${gatewayAddress || offline}">${gatewayAddress || offline}</span>
      </li>
      <li class="flex mb1">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusApiAddress')}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all" title="${api || offline}">${api || offline}</span>
      </li>
      <li class="flex mb1">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusGatewayVersion')}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all">${gatewayVersion || offline}</span>
      </li>
      <li class="flex" title="${browser.i18n.getMessage('panel_statusSwarmPeersTitle')}">
        <span class="w-40 f7 ttu no-user-select">${browser.i18n.getMessage('panel_statusSwarmPeers')}</span>
        <span class="w-60 f7 tr ${swarmPeers ? 'fw9' : ''} monospace truncate force-select-all">${swarmPeers || offline}</span>
      </li>
    </ul>
  `
}
