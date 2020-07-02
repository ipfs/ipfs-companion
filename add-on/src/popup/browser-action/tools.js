'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
const navHeader = require('./nav-header')

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
    <div>
    ${navHeader('panel_toolsSectionHeader')}
    <div class="fade-in pt1">
  ${navItem({
    text: browser.i18n.getMessage('panel_quickImport'),
    style: 'b',
    disabled: !activeQuickImport,
    onClick: onQuickImport
  })}
  ${navItem({
    text: browser.i18n.getMessage('panel_openWebui'),
    disabled: !activeWebUI,
    onClick: onOpenWebUi
  })}
    </div>
    </div>
  `
}
