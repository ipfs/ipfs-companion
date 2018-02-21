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
  onCopyIpfsAddr,
  onCopyPublicGwAddr,
  onPin,
  onUnPin
}) {
  if (!isIpfsContext) return null
  const isPinningSupported = (ipfsNodeType !== 'embedded')

  return html`
    <div class="bb b--black-20 mv2 pb2">
      ${navItem({
        text: browser.i18n.getMessage('panelCopy_currentIpfsAddress'),
        onClick: onCopyIpfsAddr
      })}
      ${navItem({
        text: browser.i18n.getMessage('panel_copyCurrentPublicGwUrl'),
        onClick: onCopyPublicGwAddr
      })}
      ${isIpfsOnline && isPinningSupported && !isPinned ? (
        navItem({
          text: browser.i18n.getMessage('panel_pinCurrentIpfsAddress'),
          disabled: isPinning,
          onClick: onPin
        })
      ) : null}
      ${isIpfsOnline && isPinningSupported && isPinned ? (
        navItem({
          text: browser.i18n.getMessage('panel_unpinCurrentIpfsAddress'),
          disabled: isUnPinning,
          onClick: onUnPin
        })
      ) : null}
    </div>
  `
}
