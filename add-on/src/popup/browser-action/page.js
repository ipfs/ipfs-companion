'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const header = require('./header')
const { activeTabActions } = require('./context-actions')
const operations = require('./operations')
const tools = require('./tools')

// Render the browser action page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
module.exports = function browserActionPage (state, emit) {
  const onCopy = (copyAction) => emit('copy', copyAction)
  const onPin = () => emit('pin')
  const onUnPin = () => emit('unPin')

  const onQuickUpload = () => emit('quickUpload')
  const onOpenWebUi = () => emit('openWebUi')
  const onOpenPrefs = () => emit('openPrefs')
  const onToggleGlobalRedirect = () => emit('toggleGlobalRedirect')
  const onToggleSiteRedirect = () => emit('toggleSiteRedirect')
  const onToggleActive = () => emit('toggleActive')

  const headerProps = Object.assign({ onToggleActive, onOpenPrefs }, state)
  const activeTabActionsProps = Object.assign({ onToggleSiteRedirect, onCopy, onPin, onUnPin }, state)
  const opsProps = Object.assign({ onQuickUpload, onOpenWebUi, onToggleGlobalRedirect }, state)

  return html`
    <div class="sans-serif" style="text-rendering: optimizeLegibility;">
      ${header(headerProps)}
      ${operations(opsProps)}
      ${activeTabActions(activeTabActionsProps)}
      ${tools(opsProps)}
    </div>
  `
}
