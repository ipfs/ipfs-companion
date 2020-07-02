'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function toolsButton ({ icon, text, title, disabled, style, onClick, switchValue }) {
  let buttonStyle = 'teal button-reset db bg-white b--none outline-0--focus pv2 ph3 tc mh1 br-pill f6 tl'
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

    <button class="inline-flex flex-row items-center ${buttonStyle}"
            onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <div class="tc truncate">${text}</div>${switchToggle({ checked: switchValue, disabled, style: 'fr ml2' })}
    </button>
  `
}

module.exports = toolsButton
