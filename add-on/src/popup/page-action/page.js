'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const header = require('./header')
const { contextActions } = require('../browser-action/context-actions')

// Render the page-action page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
module.exports = function pageActionPage (state, emit) {
  const onViewOnGateway = () => emit('viewOnGateway')
  const onCopy = (copyAction) => emit('copy', copyAction)
  const onPin = () => emit('pin')
  const onUnPin = () => emit('unPin')
  const onToggleSiteIntegrations = () => emit('toggleSiteIntegrations')

  const contextActionsProps = Object.assign({ onViewOnGateway, onCopy, onPin, onUnPin, onToggleSiteIntegrations }, state)

  // Instant init: page-action is shown only in ipfsContext
  contextActionsProps.isIpfsContext = true

  return html`
    <div class="sans-serif" style="text-rendering: optimizeLegibility;">
      ${header(contextActionsProps)}
      ${contextActions(contextActionsProps)}
    </div>
  `
}
