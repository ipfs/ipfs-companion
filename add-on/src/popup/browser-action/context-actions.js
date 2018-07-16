'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const navItem = require('./nav-item')

module.exports = function contextActions ({
  active,
  ipfsNodeType,
  isIpfsContext,
  isIpnsContext,
  isPinning,
  isUnPinning,
  isPinned,
  isIpfsOnline,
  isApiAvailable,
  onCopyIpfsAddr,
  onCopyPublicGwAddr,
  onPin,
  onUnPin,
  onCopyResolvedIpnsAddr
}) {
  if (!isIpfsContext) return null
  const activePinControls = active && isIpfsOnline && isApiAvailable && !(isPinning || isUnPinning)
  const activeIpnsResolver = active && isIpfsOnline && isApiAvailable
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
      ${isIpnsContext ? (
        navItem({
          text: browser.i18n.getMessage('panel_copyResolveIpns'),
          disabled: !activeIpnsResolver,
          onClick: onCopyResolvedIpnsAddr
        })
      ) : null}
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
