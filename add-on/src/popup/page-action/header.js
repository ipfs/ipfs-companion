'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const logo = require('../logo')

module.exports = function header ({ isIpfsContext, pageActionTitle }) {
  if (!isIpfsContext) return null
  return html`
    <div class="ph2 pv1 br2 br--top bg-light-gray">
      <h2 class="f6 mv2 tl fw1">
        ${logo({
          size: 19,
          path: '../../../icons',
          ipfsNodeType: 'external',
          isIpfsOnline: true,
          heartbeat: false
        })} <span class="pl1">${pageActionTitle || browser.i18n.getMessage('pageAction_statusPlaceholder')}</span>
      </h2>
    </div>
  `
}
