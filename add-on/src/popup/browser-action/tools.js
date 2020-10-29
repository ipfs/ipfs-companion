'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const toolsButton = require('./tools-button')

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
    <div class="flex pb2 ph2 justify-between">
  ${toolsButton({
    text: browser.i18n.getMessage('panel_quickImport'),
    title: browser.i18n.getMessage('panel_quickImportTooltip'),
    disabled: !activeQuickImport,
    onClick: onQuickImport
  })}
  ${toolsButton({
    text: browser.i18n.getMessage('panel_openWebui'),
    title: browser.i18n.getMessage('panel_openWebuiTooltip'),
    disabled: !activeWebUI,
    onClick: onOpenWebUi
  })}
    </div>
  `
}
