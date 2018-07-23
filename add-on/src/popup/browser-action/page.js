'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const header = require('./header')
const contextActions = require('./context-actions')
const operations = require('./operations')

// Render the browser action page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
module.exports = function browserActionPage (state, emit) {
  const onCopyIpfsAddr = () => emit('copyIpfsAddr')
  const onCopyPublicGwAddr = () => emit('copyPublicGwAddr')
  const onPin = () => emit('pin')
  const onUnPin = () => emit('unPin')
  const onCopyResolvedIpnsAddr = () => emit('copyResolvedIpnsAddr')

  const onQuickUpload = () => emit('quickUpload')
  const onOpenWebUi = () => emit('openWebUi')
  const onOpenPrefs = () => emit('openPrefs')
  const onToggleRedirect = () => emit('toggleRedirect')
  const onToggleNodeType = () => emit('toggleNodeType')
  const onToggleActive = () => emit('toggleActive')

  const headerProps = Object.assign({ onToggleNodeType, onToggleActive, onOpenPrefs }, state)
  const contextActionsProps = Object.assign({ onCopyIpfsAddr, onCopyPublicGwAddr, onPin, onUnPin, onCopyResolvedIpnsAddr }, state)
  const opsProps = Object.assign({ onQuickUpload, onOpenWebUi, onToggleRedirect }, state)

  return html`
    <div class="sans-serif" style="text-rendering: optimizeLegibility;">
      ${header(headerProps)}
      <div class="bb b--black-20">
        ${contextActions(contextActionsProps)}
      </div>
      <div class="bb b--black-20">
        ${operations(opsProps)}
      </div>
    </div>
  `
}
