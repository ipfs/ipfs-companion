'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')

module.exports = function operations ({
  active,
  ipfsNodeType,
  isIpfsOnline,
  isApiAvailable,
  onQuickUpload,
  onOpenWebUi
}) {
  const activeQuickUpload = active && isIpfsOnline && isApiAvailable
  const activeWebUI = active && isIpfsOnline && ipfsNodeType === 'external'

  return html`
    <div class="fade-in pv1">
  ${navItem({
    text: browser.i18n.getMessage('panel_quickUpload'),
    addClass: 'b',
    disabled: !activeQuickUpload,
    onClick: onQuickUpload
  })}
  ${navItem({
    text: browser.i18n.getMessage('panel_openWebui'),
    disabled: !activeWebUI,
    onClick: onOpenWebUi
  })}
    </div>
  `
}
