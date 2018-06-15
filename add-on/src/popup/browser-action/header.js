'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const logo = require('../logo')
const gatewayStatus = require('./gateway-status')

module.exports = function header (props) {
  const { ipfsNodeType, active, onToggleActive, isIpfsOnline } = props
  return html`
    <div class="pt3 pb1 br2 br--top ba bw1 b--white" style="background-image: url('../../../images/stars.png'), linear-gradient(to bottom, #041727 0%,#043b55 100%); background-size: 100%; background-repeat: repeat;">
    <div class="pointer no-user-select ${active ? 'fade-in' : 'o-60'}" onclick=${onToggleActive}>
      <div class="tc mb2 transition-all" style="${!active ? 'filter: blur( .15em )' : ''}" title="${isIpfsOnline ? '' : browser.i18n.getMessage('panel_statusOffline')}">
        ${logo({
          size: 52,
          path: '../../../icons',
          ipfsNodeType,
          isIpfsOnline: (active && isIpfsOnline)
        })}
      </div>
      <h1 class="montserrat f5 mt2 mb2 tc white normal">
        ${browser.i18n.getMessage('panel_headerIpfsNodeIconLabel')}
      </h1>
    </div>
      <div class="pt1  ${active ? '' : 'o-60'}">
        <div class="flex flex-row justify-center mb2">
          <label for="activeToggle" class="mdc-switch-label w-40 tr f7 white no-user-select" style="cursor: help" title="${browser.i18n.getMessage('panel_headerOnLabelTitle')}">
            ${browser.i18n.getMessage('panel_headerOnLabel')}
          </label>
          <div class="mdc-switch mh3">
            <input type="checkbox" id="activeToggle" class="mdc-switch__native-control" onchange=${onToggleActive} checked=${!active} />
            <div class="mdc-switch__background">
              <div class="mdc-switch__knob"></div>
            </div>
          </div>
          <label for="activeToggle" class="mdc-switch-label w-40 f7 white no-user-select" style="cursor: help" title="${browser.i18n.getMessage('panel_headerOffLabelTitle')}">
            ${browser.i18n.getMessage('panel_headerOffLabel')}
          </label>
        </div>
        ${gatewayStatus(props)}
      </div>
    </div>
  `
}
