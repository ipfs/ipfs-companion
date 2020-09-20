'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const icon = require('./icon')

function powerIcon ({ active, title, action, size = '1.8rem' }) {
  const svg = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"
        class="fill-current-color mr1"
        style="width:${size}; height:${size}">
        <path d="M50 20.11A29.89 29.89 0 1 0 79.89 50 29.89 29.89 0 0 0 50 20.11zm-3.22 17a3.22 3.22 0 0 1 6.44 0v6.43a3.22 3.22 0 0 1-6.44 0zM50 66.08a16.14 16.14 0 0 1-11.41-27.49 3.28 3.28 0 0 1 1.76-.65 2.48 2.48 0 0 1 2.42 2.41 2.58 2.58 0 0 1-.77 1.77A10.81 10.81 0 0 0 38.59 50a11.25 11.25 0 0 0 22.5 0 10.93 10.93 0 0 0-3.21-7.88 3.37 3.37 0 0 1-.65-1.77 2.48 2.48 0 0 1 2.42-2.41 2.16 2.16 0 0 1 1.76.65A16.14 16.14 0 0 1 50 66.08z"/>
      </svg>
    `
  return icon({ svg, title, active, action })
}

module.exports = powerIcon
