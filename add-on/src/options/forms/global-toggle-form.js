'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import switchToggle from '../../pages/components/switch-toggle.js'

export default function globalToggleForm({ active, onOptionChange }) {
  const toggle = onOptionChange('active')
  return html`
    <form class="db b mb3 bg-aqua-muted charcoal">
      <label for="active" class="dib pa3 flex items-center pointer ${!active ? 'charcoal bg-gray-muted br2' : ''}">
        ${switchToggle({ id: 'active', checked: active, onchange: toggle, style: 'mr3' })}
        ${browser.i18n.getMessage('panel_headerActiveToggleTitle')}
      </label>
    </form>
  `
}
