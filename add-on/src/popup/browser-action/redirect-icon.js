'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const icon = require('./icon')

function redirectIcon ({
  active,
  title,
  action,
  size = '2rem'
}) {
  const svg = html`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"
        class="fill-current-color"
        style="width:${size}; height:${size}">
        <path d="M75.4 41.6l-7.3-11.2c-.1-.2-.4-.2-.5 0l-7.3 11.3c-.1.2 0 .4.2.4h4.3l-.2 20.6c0 3.2-2.6 5.8-5.8 5.8h-.2a5.8 5.8 0 0 1-5.8-5.8V37.3a11.8 11.8 0 0 0-23.6 0L29 58.7h-4.3c-.2 0-.4.3-.3.5l7.3 11.6c.1.2.4.2.6 0l7.3-11.6c.1-.2 0-.5-.3-.5h-4.2l.2-21.5a5.8 5.8 0 0 1 11.6 0v25.3c0 6.5 5.3 11.8 11.8 11.8h.2c6.5 0 11.8-5.3 11.8-11.8l.2-20.4h4.4c.4 0 .2-.4.1-.5z"/>
      </svg>
    `
  return icon({
    svg,
    title,
    active,
    action
  })
}
module.exports = redirectIcon
