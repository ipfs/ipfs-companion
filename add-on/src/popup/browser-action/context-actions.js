'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
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
  const activePinControls = active && isIpfsOnline && isApiAvailable && !(isPinning || isUnPinning)

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
    disabled: !activePinControls,
    onClick: () => onCopy(contextMenuCopyRawCid)
  })}
  ${!isPinned ? (
    navItem({
      text: browser.i18n.getMessage('panel_pinCurrentIpfsAddress'),
      disabled: !activePinControls,
      onClick: onPin
    })
  ) : null}
  ${isPinned ? (
    navItem({
      text: browser.i18n.getMessage('panel_unpinCurrentIpfsAddress'),
      disabled: !activePinControls,
      onClick: onUnPin
    })
  ) : null}
  </div>
    `
  }

  const renderSiteRedirectToggle = () => {
    if (!isRedirectContext) return
    const siteRedirectToggleLabel = browser.i18n.getMessage(
      active && redirect && !currentTabRedirectOptOut
        ? 'panel_activeTabSiteRedirectDisable'
        : 'panel_activeTabSiteRedirectEnable',
      currentFqdn
    )
    return html`
  ${navItem({
    text: siteRedirectToggleLabel,
    title: siteRedirectToggleLabel,
    addClass: 'truncate',
    disabled: !(active && redirect),
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
  const showActiveTabSection = (state.redirect && state.isRedirectContext) || state.isIpfsContext
  if (!showActiveTabSection) return
  return html`
      <div class="no-select w-100 outline-0--focus tl">
        <div class="ph3 pv2 white f7 ttu" style="background-image: url('../../../images/stars.png'), linear-gradient(to left, #041727 0%,#043b55 100%); background-size: 100%; background-repeat: repeat;">
          ${browser.i18n.getMessage('panel_activeTabSectionHeader')}
        </div>
        ${contextActions(state)}
      </div>
  `
}
module.exports.activeTabActions = activeTabActions
