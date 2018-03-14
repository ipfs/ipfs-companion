'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const header = require('./header')
const contextActions = require('../browser-action/context-actions')

// Render the page-action page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
module.exports = function pageActionPage (state, emit) {
  const onCopyIpfsAddr = () => emit('copyIpfsAddr')
  const onCopyPublicGwAddr = () => emit('copyPublicGwAddr')
  const onPin = () => emit('pin')
  const onUnPin = () => emit('unPin')
  const contextActionsProps = Object.assign({ onCopyIpfsAddr, onCopyPublicGwAddr, onPin, onUnPin }, state)

  // Instant init: page-action is shown only in ipfsContext
  contextActionsProps.isIpfsContext = true

  return html`
    <div class="helvetica">
      ${header(contextActionsProps)}
      ${contextActions(contextActionsProps)}
    </div>
  `
}
