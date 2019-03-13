'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function switchToggle ({ id, onchange, checked, disabled, style }) {
  if (typeof checked === 'undefined') return
  return html`
    <div class="mdc-switch ${style || ''} ${checked ? 'mdc-switch--checked' : ''} ${disabled ? 'mdc-switch--disabled' : ''}">
      <div class="mdc-switch__track"></div>
      <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
          <input type="checkbox" id="${id}" onchange=${onchange} class="mdc-switch__native-control" role="switch"
            ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        </div>
      </div>
    </div>
  `
}

module.exports = switchToggle
