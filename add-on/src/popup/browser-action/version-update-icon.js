'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const icon = require('./icon')

function versionUpdateIcon ({ newVersion, active, title, action, className, size = '1.8rem' }) {
  let svg = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 86"
        class="fill-yellow-muted mr1"
        style="width:${size}; height:${size}">
        <path xmlns="http://www.w3.org/2000/svg" d="M71.13 28.87a29.88 29.88 0 100 42.26 29.86 29.86 0 000-42.26zm-18.39 37.6h-5.48V44.71h5.48zm0-26.53h-5.48v-5.49h5.48z"/>
      </svg>
    `
  // special handling for beta and dev builds
  // TODO: remove when we have no users on beta channel anymore
  if (newVersion.match(/\./g).length > 2) {
    svg = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 86"
          class="fill-red-muted mr1"
          style="width:${size}; height:${size}">
          <path d="M82.84 71.14L55.06 23a5.84 5.84 0 00-10.12 0L17.16 71.14a5.85 5.85 0 005.06 8.77h55.56a5.85 5.85 0 005.06-8.77zm-30.1-.66h-5.48V65h5.48zm0-10.26h-5.48V38.46h5.48z"/>
      </svg>
    `
    title = 'Beta channel is deprecated, please switch to regular releases'
    className = `${className} blink`
  }
  return icon({ svg, title, active, action, className })
}

module.exports = versionUpdateIcon
