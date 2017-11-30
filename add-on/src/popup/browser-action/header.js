'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

module.exports = function header ({ isIpfsOnline }) {
  return html`
    <div class="pv3 br2 br--top ba bw1 b--white" style="background-image: url('../../../images/stars.png'), linear-gradient(to bottom, #041727 0%,#043b55 100%); background-size: auto 100%">
      <div class="tc mb2" title="${isIpfsOnline ? '' : 'offline'}">
        <img
          src="../../../icons/ipfs-logo-${isIpfsOnline ? 'on' : 'off'}.svg"
          class="${isIpfsOnline ? 'online' : ''}"
          id="ipfs-logo"
          style="width: 52px" />
      </div>
      <h1 class="f5 mt2 mb2 tc white normal">IPFS node</h1>
      <div class="pt1 dn">
        <div class="flex flex-row justify-center mb2">
          <label for="node" class="mdc-switch-label w-40 tr f7 white">
            ${browser.i18n.getMessage('panel_headerIpfsNodeEmbedded')}
          </label>
          <div class="mdc-switch mh3">
            <input type="checkbox" id="node" class="mdc-switch__native-control" />
            <div class="mdc-switch__background">
              <div class="mdc-switch__knob"></div>
            </div>
          </div>
          <label for="node" class="mdc-switch-label w-40 f7 white">
            ${browser.i18n.getMessage('panel_headerIpfsNodeExternal')}
          </label>
        </div>
      </div>
    </div>
  `
}
