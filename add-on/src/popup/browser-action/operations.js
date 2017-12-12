'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')

module.exports = function operations ({
  ipfsNodeType,
  isIpfsOnline,
  redirectEnabled,
  onQuickUpload,
  onOpenWebUi,
  onOpenPrefs,
  onToggleRedirect
}) {
  return html`
    <div class="bb b--black-20 mv2 pb2">
      ${isIpfsOnline ? (
        navItem({
          text: browser.i18n.getMessage('panel_quickUpload'),
          bold: true,
          onClick: onQuickUpload
        })
      ) : null}
      ${ipfsNodeType === 'external' && isIpfsOnline ? (
        navItem({
          text: browser.i18n.getMessage('panel_openWebui'),
          onClick: onOpenWebUi
        })
      ) : null}
      ${navItem({
        text: browser.i18n.getMessage('panel_openPreferences'),
        onClick: onOpenPrefs
      })}
      ${ipfsNodeType === 'external' ? (
        navItem({
          text: browser.i18n.getMessage(
            redirectEnabled
              ? 'panel_switchToPublicGateway'
              : 'panel_switchToCustomGateway'
          ),
          onClick: onToggleRedirect
        })
      ) : null}
    </div>
  `
}
