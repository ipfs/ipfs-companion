'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const browser = require('webextension-polyfill')

function icon ({ svg, title, active, action }) {
  return html`
    <button class="pa0 ma0 dib bn bg-transparent pointer transition-all ${active ? 'aqua hover-snow' : 'gray hover-snow-muted'}"
      style="outline:none;"
      title="${browser.i18n.getMessage(title)}"
      onclick=${action}>
      ${svg}
    </button>
  `
}

module.exports = icon
