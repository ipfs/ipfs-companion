'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function toolsItem ({ icon, text, title, disabled, style, onClick, switchValue }) {
  let buttonStyle = 'black bg-aqua-muted db b--none outline-0--focus f6 tl'
  if (disabled) {
    buttonStyle += ' o-40'
  } else {
    buttonStyle += ' pointer'
  }
  if (style) {
    buttonStyle += ` ${style}`
  }
  if (disabled) {
    title = ''
  }

  return html`

    <button class="flex flex-row items-center justify-between ${buttonStyle}"
            onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <div class="truncate">${text}</div>${switchToggle({ checked: switchValue, disabled, style: 'fr ml2' })}
    </button>
  `
}

module.exports = toolsItem
