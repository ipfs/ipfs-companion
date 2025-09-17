'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'
import logo from '../logo.js'
import versionUpdateIcon from './version-update-icon.js'
import powerIcon from './power-icon.js'
import optionsIcon from './options-icon.js'
import ipfsVersion from './ipfs-version.js'
import gatewayStatus from './gateway-status.js'

export default function header (props) {
  const { ipfsNodeType, active, onToggleActive, onOpenPrefs, onOpenReleaseNotes, isIpfsOnline, onOpenWelcomePage, newVersion } = props
  return html`
    <div>
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
          <div class="flex flex-column ml2 white ${active ? '' : 'o-40'}" style="position: relative;">
            <div>
              <h1 class="inter fw6 f2 ttu ma0 pa0">
                IPFS
              </h1>
            </div>
            <span class="${active ? '' : 'o-0'}">${ipfsVersion(props)}</span>
          </div>
        </div>
        <div class="tr ma0 pb1">
          ${newVersion
          ? versionUpdateIcon({
            newVersion,
            active,
            title: 'panel_headerNewVersionTitle',
            action: onOpenReleaseNotes
          })
          : null}
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
