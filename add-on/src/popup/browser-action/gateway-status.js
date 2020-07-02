'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function statusEntry ({ label, labelLegend, value, check, itemClass = '', valueClass = '' }) {
  const offline = browser.i18n.getMessage('panel_statusOffline')
  label = label ? browser.i18n.getMessage(label) : null
  labelLegend = labelLegend ? browser.i18n.getMessage(labelLegend) : label
  value = value || value === 0 ? value : offline
  return html`
      <div class="flex ${check ? '' : 'o-60'} ${itemClass}" title="${labelLegend}">
        <span class="w-40 f7 ttu no-user-select">${label}</span>
        <span class="w-60 f7 tr monospace truncate force-select-all ${valueClass}" title="${value}">${value}</span>
      </div>
    `
}

function gatewayToggle ({ icon, text, title, disabled, style, onClick, switchValue }) {
  let buttonStyle = 'outline-0--focus f7 tl'
  if (disabled) {
    buttonStyle += ' o-40'
  } else {
    buttonStyle += ' pointer'
  }
  if (style) {
    buttonStyle += ` ${style}`
  }
  if (disabled) {
    title = ''
  }
  return html`
    <div class="flex flex-row items-center justify-between ${buttonStyle}"
            onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <div class="truncate">${text}</div>${switchToggle({ checked: switchValue, disabled, style: 'fr ml2' })}
    </div>
  `
}

module.exports = function gatewayStatus ({
  ipfsApiUrl,
  gatewayAddress,
  gatewayVersion,
  swarmPeers,
  ipfsNodeType,
  active,
  redirect,
  onToggleGlobalRedirect
}) {
  const api = ipfsApiUrl && ipfsNodeType === 'embedded' ? 'js-ipfs' : ipfsApiUrl
  const activeRedirectSwitch = active && ipfsNodeType !== 'embedded'
  return html`
    <ul class="fade-in list mv0 pv2 ph3 white">
    ${statusEntry({
        label: 'panel_statusSwarmPeers',
        labelLegend: 'panel_statusSwarmPeersTitle',
        value: swarmPeers,
        check: swarmPeers,
        valueClass: 'mb1'
      })}
    ${statusEntry({
      label: 'panel_statusApiAddress',
      value: api,
      check: gatewayVersion,
      itemClass: 'mb1'
    })}
    ${statusEntry({
      label: 'panel_statusGatewayAddress',
      value: gatewayAddress,
      check: gatewayAddress,
    })}
    ${gatewayToggle({
      text: browser.i18n.getMessage('panel_redirectToggle'),
      title: browser.i18n.getMessage('panel_redirectToggleTooltip'),
      disabled: !activeRedirectSwitch,
      switchValue: redirect && activeRedirectSwitch,
      onClick: onToggleGlobalRedirect
    })}
    </ul>
  `
}
