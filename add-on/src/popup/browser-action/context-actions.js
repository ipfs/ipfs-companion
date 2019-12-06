'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
const navHeader = require('./nav-header')
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
  currentTabRedirectOptOut,
  ipfsNodeType,
  isIpfsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  isApiAvailable,
  onToggleSiteRedirect,
  onViewOnGateway,
  onCopy,
  onPin,
  onUnPin
}) {
  const activeCidResolver = active && isIpfsOnline && isApiAvailable
  const activePinControls = active && isIpfsOnline && isApiAvailable
  const activeViewOnGateway = currentTab && !(currentTab.url.startsWith(pubGwURLString) || currentTab.url.startsWith(gwURLString))
  const renderIpfsContextItems = () => {
    if (!isIpfsContext) return
    return html`<div>
  ${activeViewOnGateway ? navItem({
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
  // TODO: change "redirect on {fqdn}" to "disable on {fqdn}" and disable all integrations
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
  ${renderIpfsContextItems()}
  ${renderSiteRedirectToggle()}
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
