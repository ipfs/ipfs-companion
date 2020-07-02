'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const toolsButton = require('./tools-button')
const toolsItem = require('./tools-item')


module.exports = function tools ({
  active,
  redirect,
  ipfsNodeType,
  isIpfsOnline,
  isApiAvailable,
  onQuickImport,
  onOpenWebUi,
  onToggleGlobalRedirect
}) {
  const activeQuickImport = active && isIpfsOnline && isApiAvailable
  const activeWebUI = active && isIpfsOnline && ipfsNodeType !== 'embedded'
  const activeRedirectSwitch = active && ipfsNodeType !== 'embedded'

  return html`
    <div class="bg-aqua-muted pv1 br bl bb bw1 b--white flex">
      ${toolsButton({
        text: browser.i18n.getMessage('panel_quickImport'),
        disabled: !activeQuickImport,
        onClick: onQuickImport
      })}
      ${toolsButton({
        text: browser.i18n.getMessage('panel_openWebui'),
        disabled: !activeWebUI,
        onClick: onOpenWebUi
      })}
    </div>
    <div>
    ${toolsItem({
      text: browser.i18n.getMessage('panel_redirectToggle'),
      title: browser.i18n.getMessage('panel_redirectToggleTooltip'),
      disabled: !activeRedirectSwitch,
      switchValue: redirect && activeRedirectSwitch,
      onClick: onToggleGlobalRedirect
    })}
    </div>
  `
}
