'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const browser = require('webextension-polyfill')

function icon ({ svg, title, active, action }) {
  return html`
    <button class="header-icon pa0 ma0 dib bn bg-transparent transition-all ${action ? 'pointer' : null} ${active ? 'aqua' : 'gray'}"
      style="outline:none;"
      title="${browser.i18n.getMessage(title)}"
      onclick=${action}>
      ${svg}
    </button>
  `
}

module.exports = icon
