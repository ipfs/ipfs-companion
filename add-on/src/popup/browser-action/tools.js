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
    onClick: onQuickImport,
    iconSize: 20,
    iconD: 'M71.13 28.87a29.88 29.88 0 100 42.26 29.86 29.86 0 000-42.26zm-18.39 37.6h-5.48V52.74H33.53v-5.48h13.73V33.53h5.48v13.73h13.73v5.48H52.74z'
  })}
  ${toolsButton({
    text: browser.i18n.getMessage('panel_openWebui'),
    title: browser.i18n.getMessage('panel_openWebuiTooltip'),
    disabled: !activeWebUI,
    onClick: onOpenWebUi,
    iconSize: 18,
    iconD: 'M69.69 20.57c-.51-.51-1.06-1-1.62-1.47l-.16-.1c-.56-.46-1.15-.9-1.76-1.32l-.5-.35c-.25-.17-.52-.32-.79-.48A28.27 28.27 0 0050 12.23h-.69a28.33 28.33 0 00-27.52 28.36c0 13.54 19.06 37.68 26 46a3.21 3.21 0 005 0c6.82-8.32 25.46-32.25 25.46-45.84a28.13 28.13 0 00-8.56-20.18zM51.07 49.51a9.12 9.12 0 119.13-9.12 9.12 9.12 0 01-9.13 9.12z'
  })}
    </div>
  `
}
