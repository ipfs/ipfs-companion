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
      <div class="absolute top-1 right-1">
        <div class="mdc-switch" title="${browser.i18n.getMessage('panel_headerActiveToggleTitle')}">
          <input type="checkbox" id="activeToggle" class="mdc-switch__native-control" onchange=${onToggleActive} checked=${!active} />
          <div class="mdc-switch__background">
            <div class="mdc-switch__knob"></div>
          </div>
        </div>
      </div>
    <div class="no-user-select ${active ? 'fade-in' : 'o-40'}">
      <div class="tc mb2 transition-all" style="${!active ? 'filter: blur( .15em )' : ''}" title="${browser.i18n.getMessage('panel_headerOnOffToggleTitle')}">
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
      <div class="pt1  ${active ? '' : 'o-40'}">
        ${gatewayStatus(props)}
      </div>
    </div>
  `
}
