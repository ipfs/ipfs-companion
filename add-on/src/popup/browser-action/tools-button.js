'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'

export default function toolsButton({
  disabled,
  iconD,
  iconSize,
  onClick,
  style,
  text,
  title
}) {
  let buttonStyle = 'header-icon fade-in w-50 ba bw1 snow b--snow bg-transparent f7 ph1 pv0 br4 ma1 flex justify-center items-center truncate'
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

    <div class="${buttonStyle}" onclick=${disabled ? null : onClick}  title="${title || ''}" ${disabled ? 'disabled' : ''}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="mr1" width="${iconSize}" height="${iconSize}"><path fill="currentColor" d="${iconD}"/></svg>
      <div class="flex flex-row items-center justify-between"><div class="truncate">${text}</div></div>
    </div>
  `
}
