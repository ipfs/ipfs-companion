'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function operations ({
  isIpfsOnline,
  redirectEnabled,
  onQuickUpload,
  onOpenWebUi,
  onOpenPrefs,
  onToggleRedirect
}) {
  return html`
    <div class="panel-section panel-section-list">
      ${isIpfsOnline ? html`
        <div class="panel-list-item" id="quick-upload" onclick=${onQuickUpload}>
          <div class="icon"></div>
          <div class="text">${browser.i18n.getMessage('panel_quickUpload')}</div>
          <div class="text-shortcut"></div>
        </div>
      ` : null}
      ${isIpfsOnline ? html`
        <div class="panel-list-item" onclick=${onOpenWebUi}>
          <div class="icon"></div>
          <div class="text">${browser.i18n.getMessage('panel_openWebui')}</div>
          <div class="text-shortcut"></div>
        </div>
      ` : null}
      <div class="panel-list-item" onclick=${onOpenPrefs}>
        <div class="icon"></div>
        <div class="text">${browser.i18n.getMessage('panel_openPreferences')}</div>
        <div class="text-shortcut"></div>
      </div>
      <div class="panel-list-item" onclick=${onToggleRedirect}>
        <div class="icon"></div>
        <div class="text">
          ${browser.i18n.getMessage(
            redirectEnabled
              ? 'panel_toggleGatewayRedirectDisable'
              : 'panel_toggleGatewayRedirectEnable'
          )}
        </div>
        <div class="text-shortcut"></div>
      </div>
      <div class="panel-section-separator"></div>
    </div>
  `
}
