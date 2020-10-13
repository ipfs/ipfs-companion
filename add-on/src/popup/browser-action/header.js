'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const logo = require('../logo')
const powerIcon = require('./power-icon')
const optionsIcon = require('./options-icon')
const ipfsVersion = require('./ipfs-version')
const gatewayStatus = require('./gateway-status')

module.exports = function header (props) {
  const { ipfsNodeType, active, onToggleActive, onOpenPrefs, isIpfsOnline, onOpenWelcomePage } = props
  return html`
    <div class="br2 br--top ba bw1 b--white ipfs-gradient-0">
      <div class="pt3 pr3 pb2 pl3 no-user-select flex justify-between items-center">
        <div class="inline-flex items-center">
        <div
          onclick=${onOpenWelcomePage}
          class="transition-all pointer ${active ? '' : 'o-40'}"
          style="${active ? '' : 'filter: blur( .15em )'}">
  ${logo({
    size: 54,
    path: '../../../icons',
    ipfsNodeType,
    isIpfsOnline: (active && isIpfsOnline)
  })}
        </div>
          <div class="flex flex-column ml2 white ${active ? '' : 'o-40'}">
            <div>
              <h1 class="inter fw6 f2 ttu ma0 pa0">
                IPFS
              </h1>
            </div>
            <span class="${active ? '' : 'o-0'}">${ipfsVersion(props)}</span>
          </div>
        </div>
        <div class="tr ma0 pb1">
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
      <div class="pb1 ${active ? '' : 'o-40'}">
        ${gatewayStatus(props)}
      </div>
    </div>
  `
}
