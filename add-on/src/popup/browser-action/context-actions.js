'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')
const { contextMenuCopyAddressAtPublicGw, contextMenuCopyRawCid, contextMenuCopyCanonicalAddress } = require('../../lib/context-menus')

module.exports = function contextActions ({
  active,
  ipfsNodeType,
  isIpfsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  isApiAvailable,
  onCopy,
  onPin,
  onUnPin
}) {
  if (!isIpfsContext) return null
  const activePinControls = active && isIpfsOnline && isApiAvailable && !(isPinning || isUnPinning)
  return html`
    <div class='fade-in pv1'>
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
