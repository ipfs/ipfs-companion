'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
const navHeader = require('./nav-header')

module.exports = function operations ({
  active,
  redirect,
  ipfsNodeType,
  isIpfsOnline,
  isApiAvailable,
  onQuickUpload,
  onOpenWebUi,
  onToggleGlobalRedirect
}) {
  const activeQuickUpload = active && isIpfsOnline && isApiAvailable
  const activeWebUI = active && isIpfsOnline && ipfsNodeType === 'external'

  return html`
    <div>
    <div class="fade-in pv1 bb b--black-10">
  ${navItem({
    text: browser.i18n.getMessage('panel_redirectToggle'),
    title: browser.i18n.getMessage('panel_redirectToggleTooltip'),
    disabled: !active,
    switchValue: active && redirect,
    onClick: onToggleGlobalRedirect
  })}
    </div>
    ${navHeader('panel_toolsSectionHeader')}
    <div class="fade-in pv1 bb b--black-10">
  ${navItem({
    text: browser.i18n.getMessage('panel_quickUpload'),
    style: 'b',
    disabled: !activeQuickUpload,
    onClick: onQuickUpload
  })}
  ${navItem({
    text: browser.i18n.getMessage('panel_openWebui'),
    disabled: !activeWebUI,
    onClick: onOpenWebUi
  })}
    </div>
    </div>
  `
}
