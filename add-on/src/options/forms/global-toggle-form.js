'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function globalToggleForm ({ active, onOptionChange }) {
  const toggle = onOptionChange('active', checked => !checked)
  return html`
    <form class="dib mb3">
      <label for="active" class="dib pa3 pointer ${!active ? 'charcoal bg-gray-muted br2' : ''}">
        <input class="mr2 pointer" id="active" type="checkbox" onchange=${toggle} checked=${!active} />
        ${browser.i18n.getMessage('panel_headerActiveToggleTitle')}
      </label>
    </form>
  `
}

module.exports = globalToggleForm
