'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')

module.exports = function contextActions ({
  ipfsNodeType,
  isIpfsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  isApiAvailable,
  onCopyIpfsAddr,
  onCopyPublicGwAddr,
  onPin,
  onUnPin
}) {
  if (!isIpfsContext) return null
  const showPinControls = isIpfsOnline && isApiAvailable && (ipfsNodeType !== 'embedded')
  return html`
    <div class='fade-in pv1'>
      ${navItem({
        text: browser.i18n.getMessage('panelCopy_currentIpfsAddress'),
        onClick: onCopyIpfsAddr
      })}
      ${navItem({
        text: browser.i18n.getMessage('panel_copyCurrentPublicGwUrl'),
        onClick: onCopyPublicGwAddr
      })}
      ${showPinControls && !isPinned ? (
        navItem({
          text: browser.i18n.getMessage('panel_pinCurrentIpfsAddress'),
          disabled: isPinning,
          onClick: onPin
        })
      ) : null}
      ${showPinControls && isPinned ? (
        navItem({
          text: browser.i18n.getMessage('panel_unpinCurrentIpfsAddress'),
          disabled: isUnPinning,
          onClick: onUnPin
        })
      ) : null}
    </div>
  `
}
