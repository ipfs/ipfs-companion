'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function gatewayStatus ({
  gatewayAddress,
  gatewayVersion,
  swarmPeers,
  isIpfsOnline,
  redirectEnabled
}) {
  return html`
    <div class="panel-section" id="gateway-status">
      <img
        id="icon"
        src="../../../icons/ipfs-logo-${isIpfsOnline ? 'on' : 'off'}.svg"
        class="${isIpfsOnline ? 'online' : ''}"/>
      <ul>
        <li>
          <span>${browser.i18n.getMessage('panel_statusGatewayAddress')}</span>
          <span>${gatewayAddress == null ? 'unknown' : gatewayAddress}</span>
        </li>
        <li>
          <span>${browser.i18n.getMessage('panel_statusGatewayVersion')}</span>
          <span>${gatewayVersion == null ? 'offline' : gatewayVersion}</span>
        </li>
        <li>
          <span>${browser.i18n.getMessage('panel_statusSwarmPeers')}</span>
          <span>${swarmPeers == null ? 'offline' : swarmPeers}</span>
        </li>
        <li>
          <span>${browser.i18n.getMessage('panel_statusGatewayRedirect')}</span>
          <span>
            ${browser.i18n.getMessage(
              redirectEnabled
                ? 'panel_statusGatewayRedirectEnabled'
                : 'panel_statusGatewayRedirectDisabled'
            )}
          </span>
        </li>
      </ul>
    </div>
  `
}
