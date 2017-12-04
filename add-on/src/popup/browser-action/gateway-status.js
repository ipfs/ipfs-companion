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
    <ul class="list mv3 ph3">
      <li class="flex mb1">
        <span class="w-50 f6 ttu">${browser.i18n.getMessage('panel_statusGatewayAddress')}</span>
        <span class="w-50 f6 truncate tr">${gatewayAddress == null ? 'unknown' : gatewayAddress}</span>
      </li>
      <li class="flex mb1">
        <span class="w-50 f6 ttu">${browser.i18n.getMessage('panel_statusGatewayVersion')}</span>
        <span class="w-50 f6 ttu tr">${gatewayVersion == null ? 'offline' : gatewayVersion}</span>
      </li>
      <li class="flex mb1">
        <span class="w-50 f6 ttu">${browser.i18n.getMessage('panel_statusSwarmPeers')}</span>
        <span class="w-50 f6 ttu tr">${swarmPeers == null ? 'offline' : swarmPeers}</span>
      </li>
      <li class="flex">
        <span class="w-50 f6 ttu">${browser.i18n.getMessage('panel_statusGatewayRedirect')}</span>
        <span class="w-50 f6 ttu tr">
          ${browser.i18n.getMessage(
            redirectEnabled
              ? 'panel_statusGatewayRedirectEnabled'
              : 'panel_statusGatewayRedirectDisabled'
          )}
        </span>
      </li>
    </ul>
  `
}
