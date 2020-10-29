'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')

function toolsButton ({ icon, text, helperText, title, disabled, style, onClick }) {
  let buttonStyle = 'button-reset fade-in w-50 ba bw1 snow b--snow bg-transparent f7 ph1 pv0 br4 ma1 flex justify-center items-center truncate'
  if (disabled) {
    buttonStyle += ' o-60'
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

    <button class="${buttonStyle}" onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="mr1" width="20"><path fill="currentColor" d="M71.13 28.87a29.88 29.88 0 100 42.26 29.86 29.86 0 000-42.26zm-18.39 37.6h-5.48V52.74H33.53v-5.48h13.73V33.53h5.48v13.73h13.73v5.48H52.74z"/></svg>
      <div class="flex flex-row items-center justify-between"><div class="truncate">${text}</div></div>
    </button>
  `
}

module.exports = toolsButton
