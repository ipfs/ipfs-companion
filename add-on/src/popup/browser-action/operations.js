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
  onOpenPrefs,
  onToggleRedirect
}) {
  const showQuickUpload = isIpfsOnline && isApiAvailable
  const showWebUI = isIpfsOnline && ipfsNodeType === 'external'
  const showGatewaySwitch = active && ipfsNodeType === 'external'
  return html`
    <div class="fade-in pv1">
      ${navItem({
        text: browser.i18n.getMessage('panel_openPreferences'),
        onClick: onOpenPrefs
      })}
      ${showWebUI ? (
        navItem({
          text: browser.i18n.getMessage('panel_openWebui'),
          onClick: onOpenWebUi
        })
      ) : null}
      ${showGatewaySwitch ? (
        navItem({
          text: browser.i18n.getMessage(
            redirectEnabled
              ? 'panel_switchToPublicGateway'
              : 'panel_switchToCustomGateway'
          ),
          onClick: onToggleRedirect
        })
      ) : null}
      ${showQuickUpload ? (
        navItem({
          text: browser.i18n.getMessage('panel_quickUpload'),
          bold: true,
          onClick: onQuickUpload
        })
      ) : null}
    </div>
  `
}
