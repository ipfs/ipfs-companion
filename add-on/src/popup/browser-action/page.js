'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const contextActions = require('./context-actions')
const operations = require('./operations')
const gatewayStatus = require('./gateway-status')

module.exports = function browserActionPage (state, emit) {
  const onCopyIpfsAddr = () => emit('copyIpfsAddr')
  const onCopyPublicGwAddr = () => emit('copyPublicGwAddr')
  const onPin = () => emit('pin')
  const onUnPin = () => emit('unPin')

  const onQuickUpload = () => emit('quickUpload')
  const onOpenWebUi = () => emit('openWebUi')
  const onOpenPrefs = () => emit('openPrefs')
  const onToggleRedirect = () => emit('toggleRedirect')

  const contextActionsProps = Object.assign({ hidden: state.contextActionsHidden, onCopyIpfsAddr, onCopyPublicGwAddr, onPin, onUnPin }, state)
  const opsProps = Object.assign({ onQuickUpload, onOpenWebUi, onOpenPrefs, onToggleRedirect }, state)
  const gwStatusProps = Object.assign({}, state)

  return html`
    <div class="panel">
      ${contextActions(contextActionsProps)}
      ${operations(opsProps)}
      ${gatewayStatus(gwStatusProps)}
    </div>
  `
}
