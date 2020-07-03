'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function statusEntry ({ label, labelLegend, value, check, itemClass = '', valueClass = '' }) {
  const offline = browser.i18n.getMessage('panel_statusOffline')
  label = label ? browser.i18n.getMessage(label) : null
  labelLegend = labelLegend ? browser.i18n.getMessage(labelLegend) : label
  value = value || value === 0 ? value : offline
  return html`
      <div class="flex mb1 ${check ? '' : 'o-60'} ${itemClass}" title="${labelLegend}">
        <span class="w-40 f7 ttu no-user-select">${label}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all ${valueClass}" title="${value}">${value}</span>
      </div>
    `
}

module.exports = function gatewayStatus ({
  ipfsApiUrl,
  gatewayAddress,
  gatewayVersion,
  swarmPeers,
  ipfsNodeType
}) {
  const api = ipfsApiUrl && ipfsNodeType === 'embedded' ? 'js-ipfs' : ipfsApiUrl
  return html`
    <ul class="fade-in list mv0 pv2 ph3 white">
    ${statusEntry({
      label: 'panel_statusSwarmPeers',
      labelLegend: 'panel_statusSwarmPeersTitle',
      value: swarmPeers,
      check: swarmPeers
    })}
    ${statusEntry({
      label: 'panel_statusGatewayAddress',
      labelLegend: 'panel_statusGatewayAddressTitle',
      value: gatewayAddress,
      check: gatewayAddress
    })}
    ${statusEntry({
      label: 'panel_statusApiAddress',
      labelLegend: 'panel_statusApiAddressTitle',
      value: api,
      check: gatewayVersion
    })}
    </ul>
  `
}
