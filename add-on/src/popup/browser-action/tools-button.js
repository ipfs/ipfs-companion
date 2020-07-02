'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function toolsButton ({ icon, text, title, disabled, style, onClick }) {
  let buttonStyle = 'teal button-reset db bg-white b--none outline-0--focus pv1 ph2 tc mh1 br-pill f6 tl'
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

    <button class="inline-flex items-center w-50 ${buttonStyle}"
            onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <div class="w-100 tc truncate">${text}</div>
    </button>
  `
}

module.exports = toolsButton
