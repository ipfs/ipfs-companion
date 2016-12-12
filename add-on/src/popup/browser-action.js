'use strict'
/* eslint-env browser, webextensions */

function set (id, value) {
  document.getElementById(id).innerHTML = value
}

// PoC option display
browser.storage.local.get('customGatewayUrl')
  .then(options => { set('gateway-address-val', options['customGatewayUrl']) })
  .catch(() => { set('gateway-address-val', '???') })

// PoC access to ipfs api
browser.runtime.getBackgroundPage()
  .then(background => {
    let ipfs = background.ipfs
    ipfs.version()
      .then(v => { set('gateway-version-val', (v.commit ? v.version + '/' + v.commit : v.version)) })
      .catch(() => { set('gateway-version-val', 'n/a') })
  })
  .catch(error => {
    console.error(`Unable to access background page due to ${error}`)
  })

