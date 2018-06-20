'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function navItem ({ icon, text, bold, disabled, onClick }) {
  let className = 'black button-reset db w-100 bg-white b--none outline-0--focus pv2 ph3 f5 tl'
  if (bold) className += ' b'
  if (disabled) {
    className += ' o-40'
  } else {
    className += ' pointer bg-near-white--hover'
  }

  return html`
    <button class="${className}" onclick=${disabled ? null : onClick} ${disabled ? 'disabled' : ''}>
      ${text}
    </button>
  `
}

module.exports = navItem
