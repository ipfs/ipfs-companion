'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function contextActions ({
  hidden,
  pinHidden,
  pinDisabled,
  unPinHidden,
  unPinDisabled,
  onCopyIpfsAddr,
  onCopyPublicGwAddr,
  onPin,
  onUnPin
}) {
  if (hidden) return null

  return html`
    <div class="panel-section panel-section-list">
      <div class="panel-list-item" onclick=${onCopyIpfsAddr}>
        <div class="icon"></div>
        <div class="text">${browser.i18n.getMessage('panelCopy_currentIpfsAddress')}</div>
        <div class="text-shortcut"></div>
      </div>
      <div class="panel-list-item" onclick=${onCopyPublicGwAddr}>
        <div class="icon"></div>
        <div class="text">${browser.i18n.getMessage('panel_copyCurrentPublicGwUrl')}</div>
        <div class="text-shortcut"></div>
      </div>
      ${pinHidden ? null : html`
        <div class="panel-list-item ${pinDisabled ? 'disabled' : ''}" onclick=${onPin}>
          <div class="icon"></div>
          <div class="text">${browser.i18n.getMessage('panel_pinCurrentIpfsAddress')}</div>
          <div class="text-shortcut"></div>
        </div>
      `}
      ${unPinHidden ? null : html`
        <div class="panel-list-item ${unPinDisabled ? 'disabled' : ''}" onclick=${onUnPin}>
          <div class="icon"></div>
          <div class="text">${browser.i18n.getMessage('panel_unpinCurrentIpfsAddress')}</div>
          <div class="text-shortcut"></div>
        </div>
      `}
      <div class="panel-section-separator"></div>
    </div>
  `
}
