'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
const navHeader = require('./nav-header')
const { sameGateway } = require('../../lib/ipfs-path')
const {
  contextMenuViewOnGateway,
  contextMenuCopyAddressAtPublicGw,
  contextMenuCopyRawCid,
  contextMenuCopyCanonicalAddress
} = require('../../lib/context-menus')

// Context Actions are displayed in Browser Action and Page Action (FF only)
function contextActions ({
  active,
  redirect,
  isRedirectContext,
  pubGwURLString,
  gwURLString,
  currentTab,
  currentFqdn,
  currentDnslinkFqdn,
  currentTabIntegrationsOptOut,
  ipfsNodeType,
  isIpfsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  isApiAvailable,
  onToggleSiteIntegrations,
  onViewOnGateway,
  onCopy,
  onPin,
  onUnPin
}) {
  const activeCidResolver = active && isIpfsOnline && isApiAvailable
  const activePinControls = active && isIpfsOnline && isApiAvailable
  const activeViewOnGateway = (currentTab) => {
    if (!currentTab) return false
    const { url } = currentTab
    return !(sameGateway(url, gwURLString) || sameGateway(url, pubGwURLString))
  }

  const renderIpfsContextItems = () => {
    if (!isIpfsContext) return
    return html`<div>
  ${activeViewOnGateway(currentTab) ? navItem({
    text: browser.i18n.getMessage(contextMenuViewOnGateway),
    onClick: () => onViewOnGateway(contextMenuViewOnGateway)
  }) : null}
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
  const renderSiteIntegrationsToggle = () => {
    if (!isRedirectContext) return
    return html`
  ${navItem({
    text: browser.i18n.getMessage('panel_activeTabSiteIntegrationsToggle', currentFqdn),
    title: browser.i18n.getMessage('panel_activeTabSiteIntegrationsToggleTooltip', currentFqdn),
    style: 'truncate',
    disabled: !(active),
    switchValue: active && !currentTabIntegrationsOptOut,
    onClick: onToggleSiteIntegrations
  })}
      `
  }
  return html`
    <div class='fade-in pv1'>
  ${renderSiteIntegrationsToggle()}
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
      <div class="fade-in pv0 bb b--black-10">
        ${contextActions(state)}
      </div>
      </div>
  `
}

module.exports.activeTabActions = activeTabActions
