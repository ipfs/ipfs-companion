'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
const navHeader = require('./nav-header')
const { contextMenuCopyAddressAtPublicGw, contextMenuCopyRawCid, contextMenuCopyCanonicalAddress } = require('../../lib/context-menus')

// Context Actions are displayed in Browser Action and Page Action (FF only)
function contextActions ({
  active,
  redirect,
  isRedirectContext,
  currentFqdn,
  currentTabRedirectOptOut,
  ipfsNodeType,
  isIpfsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  isApiAvailable,
  onToggleSiteRedirect,
  onCopy,
  onPin,
  onUnPin
}) {
  const activeCidResolver = active && isIpfsOnline && isApiAvailable
  const activePinControls = active && isIpfsOnline && isApiAvailable

  const renderIpfsContextItems = () => {
    if (!isIpfsContext) return
    return html`<div>
  ${navItem({
    text: browser.i18n.getMessage(contextMenuCopyAddressAtPublicGw),
    onClick: () => onCopy(contextMenuCopyAddressAtPublicGw)
  })}
  ${navItem({
    text: browser.i18n.getMessage(contextMenuCopyCanonicalAddress),
    onClick: () => onCopy(contextMenuCopyCanonicalAddress)
  })}
  ${navItem({
    text: browser.i18n.getMessage(contextMenuCopyRawCid),
    disabled: !activeCidResolver,
    onClick: () => onCopy(contextMenuCopyRawCid)
  })}
  ${navItem({
    text: browser.i18n.getMessage('panel_pinCurrentIpfsAddress'),
    title: browser.i18n.getMessage('panel_pinCurrentIpfsAddressTooltip'),
    disabled: !activePinControls,
    switchValue: (isPinned || isPinning) && !isUnPinning,
    onClick: isPinned ? onUnPin : onPin
  })}
  </div>
    `
  }

  const renderSiteRedirectToggle = () => {
    if (!isRedirectContext) return
    return html`
  ${navItem({
    text: browser.i18n.getMessage('panel_activeTabSiteRedirectToggle', currentFqdn),
    title: browser.i18n.getMessage('panel_activeTabSiteRedirectToggleTooltip', currentFqdn),
    style: 'truncate',
    disabled: !(active && redirect),
    switchValue: active && redirect && !currentTabRedirectOptOut,
    onClick: onToggleSiteRedirect
  })}
      `
  }

  return html`
    <div class='fade-in pv1'>
  ${renderSiteRedirectToggle()}
  ${renderIpfsContextItems()}
    </div>
  `
}
module.exports.contextActions = contextActions

// "Active Tab" section is displayed in Browser Action  only
// if redirect can be toggled or current tab has any IPFS Context Actions
function activeTabActions (state) {
  const showActiveTabSection = (state.isRedirectContext) || state.isIpfsContext
  if (!showActiveTabSection) return
  return html`
      <div>
      ${navHeader('panel_activeTabSectionHeader')}
      <div class="fade-in pv1 bb b--black-10">
        ${contextActions(state)}
      </div>
      </div>
  `
}
module.exports.activeTabActions = activeTabActions
