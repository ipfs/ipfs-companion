'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'

export default function navHeader(label) {
  return html`
    <div class="no-select w-100 outline-0--focus tl ph3 pt2 mt1 pb1 o-40 f6">
      ${browser.i18n.getMessage(label)}
    </div>
  `
}
