'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function navHeader (label) {
  return html`
    <div class="no-select w-100 outline-0--focus tl ph3 pt2 charcoal-muted f7 ttu">
      ${browser.i18n.getMessage(label)}
    </div>
  `
}

module.exports = navHeader
