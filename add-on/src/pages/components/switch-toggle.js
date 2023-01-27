'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'

/**
 * @type {import('../../types.js').SwitchToggle}
 */
export default function switchToggle ({
  checked,
  disabled,
  id,
  onchange,
  style
}) {
  if (typeof checked === 'undefined') return
  // @ts-expect-error - TS doesn't like the `html` template tag
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
