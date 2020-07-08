'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')

module.exports = function tools ({
  active,
  ipfsNodeType,
  isIpfsOnline,
  isApiAvailable,
  onQuickImport,
  onOpenWebUi
}) {
  const activeQuickImport = active && isIpfsOnline && isApiAvailable
  const activeWebUI = active && isIpfsOnline && ipfsNodeType !== 'embedded'

  return html`
    <div class="fade-in pv1">
  ${navItem({
    text: browser.i18n.getMessage('panel_quickImport'),
    title: browser.i18n.getMessage('panel_quickImportTooltip'),
    disabled: !activeQuickImport,
    onClick: onQuickImport
  })}
  ${navItem({
    text: browser.i18n.getMessage('panel_openWebui'),
    title: browser.i18n.getMessage('panel_openWebuiTooltip'),
    disabled: !activeWebUI,
    onClick: onOpenWebUi
  })}
    </div>
  `
}
