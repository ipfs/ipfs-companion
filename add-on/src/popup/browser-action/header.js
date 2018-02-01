'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const logo = require('../logo')
const isJsIpfsEnabled = require('../../lib/is-js-ipfs-enabled')()

module.exports = function header ({ ipfsNodeType, onToggleNodeType, isIpfsOnline }) {
  return html`
    <div class="pv3 ba bw1 bt-0 br-0 bl-0" style="background-image: url('../../../images/stars.png'), linear-gradient(to bottom, #041727 0%,#043b55 100%); background-size: auto 100%">
      <div class="tc mb2" title="${isIpfsOnline ? '' : 'offline'}">
        ${logo({
          size: 52,
          path: '../../../icons',
          ipfsNodeType,
          isIpfsOnline
        })}
      </div>
      <h1 class="f5 mt2 mb2 tc white normal">IPFS node</h1>
      <div class="pt1 ${isJsIpfsEnabled ? '' : 'dn'}">
        <div class="flex flex-row justify-center mb2">
          <label for="node" class="mdc-switch-label w-40 tr f7 white" title="${browser.i18n.getMessage('panel_headerIpfsNodeEmbeddedTitle')}">
            ${browser.i18n.getMessage('panel_headerIpfsNodeEmbedded')}
          </label>
          <div class="mdc-switch mh3">
            <input type="checkbox" id="node" class="mdc-switch__native-control" onchange=${onToggleNodeType} checked=${ipfsNodeType === 'external'} />
            <div class="mdc-switch__background">
              <div class="mdc-switch__knob"></div>
            </div>
          </div>
          <label for="node" class="mdc-switch-label w-40 f7 white" title="${browser.i18n.getMessage('panel_headerIpfsNodeExternalTitle')}">
            ${browser.i18n.getMessage('panel_headerIpfsNodeExternal')}
          </label>
        </div>
      </div>
    </div>
  `
}
