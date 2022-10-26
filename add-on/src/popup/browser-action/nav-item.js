'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'
import switchToggle from '../../pages/components/switch-toggle.js'

export default function navItem ({
  disabled,
  helperText,
  onClick,
  style,
  switchValue,
  text,
  title
}) {
  let buttonStyle = 'black button-reset db w-100 bg-white b--none outline-0--focus pt2 ph3 f6 tl'
  if (disabled) {
    buttonStyle += ' o-40'
  } else {
    buttonStyle += ' pointer bg-near-white--hover'
  }
  if (style) {
    buttonStyle += ` ${style}`
  }
  if (disabled) {
    title = ''
  }

  return html`

    <button class="${buttonStyle}"
            onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <div class="flex flex-row items-center justify-between"><div class="truncate">${text}</div>${switchToggle({ checked: switchValue, disabled, style: 'fr ml2' })}</div>
      <div class="f7 o-40 w-80 truncate mv1">${helperText}</div>
    </button>
  `
}
