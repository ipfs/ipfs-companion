'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function switchToggle ({ checked, disabled, style }) {
  if (typeof checked === 'undefined') return
  return html`
    <div class="mdc-switch ${style || ''} ${checked ? 'mdc-switch--checked' : 'mdc-switch--disabled'}">
      <div class="mdc-switch__track"></div>
      <div class="mdc-switch__thumb-underlay">
        <div class="mdc-switch__thumb">
          <input type="checkbox" id="another-basic-switch" class="mdc-switch__native-control" role="switch"
            ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
        </div>
      </div>
    </div>
  `
}

module.exports = switchToggle
