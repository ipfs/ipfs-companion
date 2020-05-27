'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const logo = require('../logo')
const powerIcon = require('./power-icon')
const optionsIcon = require('./options-icon')
const gatewayStatus = require('./gateway-status')

module.exports = function header (props) {
  const { ipfsNodeType, active, onToggleActive, onOpenPrefs, isIpfsOnline, onOpenWelcomePage } = props
  return html`
    <div class="pt3 pb1 br2 br--top ba bw1 b--white" style="background-image: url('../../../images/stars.png'), linear-gradient(to bottom, #041727 0%,#043b55 100%); background-size: 100%; background-repeat: repeat;">
      <div class="no-user-select">
        <div
          onclick=${onOpenWelcomePage}
          class="tc mb2 transition-all pointer ${active ? '' : 'o-40'}"
          style="${active ? '' : 'filter: blur( .15em )'}">
  ${logo({
    size: 52,
    path: '../../../icons',
    ipfsNodeType,
    isIpfsOnline: (active && isIpfsOnline)
  })}
        </div>
        <h1 class="mb1 montserrat f5 mt2 tc white normal ${active ? '' : 'o-40'}">
          ${browser.i18n.getMessage('panel_headerIpfsNodeIconLabel')}
        </h1>
        <div class="tc ma0 pa0">
  ${powerIcon({
    active,
    title: 'panel_headerActiveToggleTitle',
    action: onToggleActive
  })}
  ${optionsIcon({
    active,
    title: 'panel_openPreferences',
    action: onOpenPrefs
  })}
        </div>
      </div>
      <div class=" ${active ? '' : 'o-40'}">
        ${gatewayStatus(props)}
      </div>
    </div>
  `
}
