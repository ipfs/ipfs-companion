'use strict'
/* eslint-env browser, webextensions */

const enableRedirect = document.getElementById('enable-gateway-redirect')
const disableRedirect = document.getElementById('disable-gateway-redirect')
const openWebUI = document.getElementById('open-webui')
const openPreferences = document.getElementById('open-preferences')
const quickUpload = document.getElementById('quick-upload')

const ipfsIcon = document.getElementById('icon')
const ipfsIconOn = '../../icons/ipfs-logo-on.svg'
const ipfsIconOff = '../../icons/ipfs-logo-off.svg'
const offline = 'offline'

function show (id) {
  document.getElementById(id).classList.remove('hidden')
}

function hide (id) {
  document.getElementById(id).classList.add('hidden')
}

function set (id, value) {
  document.getElementById(id).textContent = value
}

quickUpload.onclick = () => browser.tabs.create({ url: browser.extension.getURL('src/popup/quick-upload.html') })

enableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: true})
  .then(updatePopup)
  .catch(error => { console.error(`Unable to update redirect state due to ${error}`) })

disableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: false})
  .then(updatePopup)
  .catch(error => { console.error(`Unable to update redirect state due to ${error}`) })

openWebUI.onclick = async () => {
  try {
    const options = await browser.storage.local.get('ipfsApiUrl')
    const apiUrl = options['ipfsApiUrl']
    await browser.tabs.create({ url: apiUrl + '/webui/' })
    window.close()
  } catch (error) {
    console.error(`Unable Open Web UI due to ${error}`)
  }
}

openPreferences.onclick = () => {
  browser.runtime.openOptionsPage().then(() => window.close())
}

async function updatePopup () {
  // update redirect status
  const options = await browser.storage.local.get()
  try {
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
    if (options['automaticMode']) {
      hide('toggle-gateway-redirect')
    }
    set('gateway-address-val', options['customGatewayUrl'])
  } catch (error) {
    console.error(`Unable update redirect state due to ${error}`)
    set('gateway-address-val', '???')
  }

  try {
    const background = await browser.runtime.getBackgroundPage()
    if (background.ipfs) {
      // update gateway version
      try {
        const v = await background.ipfs.version()
        set('gateway-version-val', (v.commit ? v.version + '/' + v.commit : v.version))
      } catch (error) {
        set('gateway-version-val', offline)
      }
      // update swarm peer count
      try {
        const peerCount = await background.getSwarmPeerCount()
        set('swarm-peers-val', peerCount < 0 ? offline : peerCount)
        ipfsIcon.src = peerCount > 0 ? ipfsIconOn : ipfsIconOff
        if (peerCount > 0) { // API is online & there are peers
          show('quick-upload')
        } else {
          hide('quick-upload')
        }
        if (peerCount < 0) { // API is offline
          hide('open-webui')
        } else {
          show('open-webui')
        }
      } catch (error) {
        console.error(`Unable update peer count due to ${error}`)
      }
    }
  } catch (error) {
    console.error(`Error while accessing background page: ${error}`)
  }
}

// run on initial popup load
hide('quick-upload')
hide('open-webui')
updatePopup()

// listen to any changes and update diagnostics
browser.alarms.onAlarm.addListener(updatePopup)
