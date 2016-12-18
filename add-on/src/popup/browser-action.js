'use strict'
/* eslint-env browser, webextensions */

const enableRedirect = document.getElementById('enable-gateway-redirect')
const disableRedirect = document.getElementById('disable-gateway-redirect')
const openWebUI = document.getElementById('open-webui')
const openPreferences = document.getElementById('open-preferences')

enableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: true}).then(updatePopup)
disableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: false}).then(updatePopup)
openWebUI.onclick = () => {
  browser.storage.local.get('ipfsApiUrl')
    .then(options => {
      const apiUrl = options['ipfsApiUrl']
      browser.tabs.create({ url: apiUrl + '/webui/' })
    })
}
openPreferences.onclick = () => {
  browser.runtime.openOptionsPage()
}

function set (id, value) {
  document.getElementById(id).innerHTML = value
}

function show (id) {
  document.getElementById(id).style = 'display:inline-block'
}

function hide (id) {
  document.getElementById(id).style = 'display:none'
}

function updatePopup () {
  // update redirect status
  browser.storage.local.get('useCustomGateway')
    .then(options => {
      const enabled = options['useCustomGateway']
      if (enabled) {
        hide('redirect-disabled')
        hide('enable-gateway-redirect')
        show('redirect-enabled')
        show('disable-gateway-redirect')
      } else {
        hide('redirect-enabled')
        hide('disable-gateway-redirect')
        show('redirect-disabled')
        show('enable-gateway-redirect')
      }
    })

  // update gateway addresss
  browser.storage.local.get('customGatewayUrl')
    .then(options => { set('gateway-address-val', options['customGatewayUrl']) })
    .catch(() => { set('gateway-address-val', '???') })

  browser.runtime.getBackgroundPage()
    .then(background => {
      if (background.ipfs) {
        // update gateway version
        background.ipfs.version()
          .then(v => { set('gateway-version-val', (v.commit ? v.version + '/' + v.commit : v.version)) })
          .catch(() => { set('gateway-version-val', 'offline') })
        // update swarm peer count
        background.getSwarmPeerCount()
          .then(peerCount => {
            if (peerCount < 0) {
              set('swarm-peers-val', 'offline')
            } else { set('swarm-peers-val', peerCount) }
          })
      }
    })
    .catch(error => {
      console.error(`Error while accessing background page: ${error}`)
    })
}

// run on initial popup load
updatePopup()

// listen to any changes and update diagnostics
browser.alarms.onAlarm.addListener(updatePopup)
