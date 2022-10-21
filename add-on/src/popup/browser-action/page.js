'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'
import header from './header.js'
import { activeTabActions } from './context-actions.js'
import tools from './tools.js'

// Render the browser action page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
export default function browserActionPage(state, emit) {
  const onViewOnGateway = () => emit('viewOnGateway')
  const onCopy = (copyAction) => emit('copy', copyAction)
  const onFilesCpImport = () => emit('filesCpImport')

  const onQuickImport = () => emit('quickImport')
  const onOpenWebUi = () => emit('openWebUi', '/')
  const onOpenWelcomePage = () => emit('openWelcomePage')
  const onOpenPrefs = () => emit('openPrefs')
  const onOpenReleaseNotes = () => emit('openReleaseNotes')
  const onToggleGlobalRedirect = () => emit('toggleGlobalRedirect')
  const onToggleSiteIntegrations = () => emit('toggleSiteIntegrations')
  const onToggleActive = () => emit('toggleActive')

  const headerProps = Object.assign({ onToggleActive, onOpenPrefs, onOpenReleaseNotes, onOpenWelcomePage }, state)
  const activeTabActionsProps = Object.assign({ onViewOnGateway, onToggleSiteIntegrations, onCopy, onFilesCpImport }, state)
  const opsProps = Object.assign({ onQuickImport, onOpenWebUi, onToggleGlobalRedirect }, state)

  return html`
    <div class="sans-serif" style="text-rendering: optimizeLegibility;">
      <div class="ba bw1 b--white ipfs-gradient-0">
        ${header(headerProps)}
        ${tools(opsProps)}
      </div>
      ${activeTabActions(activeTabActionsProps)}
    </div>
  `
}
