'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const icon = require('./icon')

function versionUpdateIcon ({ active, title, action, size = '1.8rem' }) {
  const svg = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"
        class="fill-yellow mr1"
        style="width:${size}; height:${size}">
        <path xmlns="http://www.w3.org/2000/svg" d="M71.13 28.87a29.88 29.88 0 100 42.26 29.86 29.86 0 000-42.26zm-18.39 37.6h-5.48V44.71h5.48zm0-26.53h-5.48v-5.49h5.48z"/>
      </svg>
    `
  return icon({ svg, title, active, action })
}

module.exports = versionUpdateIcon
