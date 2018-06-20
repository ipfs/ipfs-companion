'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')

module.exports = function operations ({
  active,
  ipfsNodeType,
  isIpfsOnline,
  redirectEnabled,
  isApiAvailable,
  onQuickUpload,
  onOpenWebUi,
  onToggleRedirect
}) {
  const activeQuickUpload = active && isIpfsOnline && isApiAvailable
  const activeWebUI = active && isIpfsOnline && ipfsNodeType === 'external'
  const activeGatewaySwitch = active && ipfsNodeType === 'external'

  return html`
    <div class="fade-in pv1">
      ${navItem({
        text: browser.i18n.getMessage('panel_quickUpload'),
        bold: true,
        disabled: !activeQuickUpload,
        onClick: onQuickUpload
      })}
      ${navItem({
        text: browser.i18n.getMessage(
          redirectEnabled && activeGatewaySwitch
            ? 'panel_switchToPublicGateway'
            : 'panel_switchToCustomGateway'
        ),
        disabled: !activeGatewaySwitch,
        onClick: onToggleRedirect
      })}
      ${navItem({
        text: browser.i18n.getMessage('panel_openWebui'),
        disabled: !activeWebUI,
        onClick: onOpenWebUi
      })}
    </div>
  `
}
