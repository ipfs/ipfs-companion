'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function navItem ({ icon, text, title, subtitle, disabled, style, onClick, switchValue }) {
  let buttonStyle = 'black button-reset db w-100 bg-white b--none outline-0--focus pv2 ph3 f6 tl'
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
      <div class="f7 o-40 w-80 truncate mt1">bafybeieltqren5gbivmavam532nvlsyxy725bpxqk77zvmaflrdyvu4yxm</div>
    </button>
  `
}

module.exports = navItem
