'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function contextActions ({
  isIpfsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  onCopyIpfsAddr,
  onCopyPublicGwAddr,
  onPin,
  onUnPin
}) {
  if (!isIpfsContext) return null

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
      ${isIpfsOnline && isPinned ? null : html`
        <div class="panel-list-item ${isPinning ? 'disabled' : ''}" onclick=${onPin}>
          <div class="icon"></div>
          <div class="text">${browser.i18n.getMessage('panel_pinCurrentIpfsAddress')}</div>
          <div class="text-shortcut"></div>
        </div>
      `}
      ${isIpfsOnline && isPinned ? html`
        <div class="panel-list-item ${isUnPinning ? 'disabled' : ''}" onclick=${onUnPin}>
          <div class="icon"></div>
          <div class="text">${browser.i18n.getMessage('panel_unpinCurrentIpfsAddress')}</div>
          <div class="text-shortcut"></div>
        </div>
      ` : null}
      <div class="panel-section-separator"></div>
    </div>
  `
}
