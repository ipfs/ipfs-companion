'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function navItem ({ icon, text, bold, disabled, onClick }) {
  let className = 'button-reset db w-100 black bg-white bg-near-white--hover b--none outline-0--focus pointer pv2 ph3 f5 tl'
  if (bold) className += ' b'

  return html`
    <button class="${className}" onclick=${disabled ? null : onClick} ${disabled ? 'disabled' : ''}>
      ${text}
    </button>
  `
}

module.exports = navItem
