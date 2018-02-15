'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const header = require('./header')
const contextActions = require('./context-actions')
const operations = require('./operations')
const gatewayStatus = require('./gateway-status')

// Render the browser action page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
module.exports = function browserActionPage (state, emit) {
  const onCopyIpfsAddr = () => emit('copyIpfsAddr')
  const onCopyPublicGwAddr = () => emit('copyPublicGwAddr')
  const onPin = () => emit('pin')
  const onUnPin = () => emit('unPin')

  const onQuickUpload = () => emit('quickUpload')
  const onOpenWebUi = () => emit('openWebUi')
  const onOpenPrefs = () => emit('openPrefs')
  const onToggleRedirect = () => emit('toggleRedirect')
  const onToggleNodeType = () => emit('toggleNodeType')

  const headerProps = Object.assign({ onToggleNodeType }, state)
  const contextActionsProps = Object.assign({ onCopyIpfsAddr, onCopyPublicGwAddr, onPin, onUnPin }, state)
  const opsProps = Object.assign({ onQuickUpload, onOpenWebUi, onOpenPrefs, onToggleRedirect }, state)
  const gwStatusProps = Object.assign({}, state)

  return html`
    <div class="helvetica">
      ${header(headerProps)}
      ${contextActions(contextActionsProps)}
      ${operations(opsProps)}
      ${gatewayStatus(gwStatusProps)}
    </div>
  `
}
