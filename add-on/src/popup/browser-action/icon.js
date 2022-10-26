'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'
import browser from 'webextension-polyfill'

export default function icon ({
  svg, title, active, action, className
}) {
  return html`
    <button class="header-icon pa0 ma0 dib bn bg-transparent transition-all ${className} ${action ? 'pointer' : null} ${active ? 'aqua' : 'gray'}"
      style="outline:none;"
      title="${browser.i18n.getMessage(title) || title}"
      onclick=${action}>
      ${svg}
    </button>
  `
}
