'use strict'
/* eslint-env browser, webextensions */

const ipfsContextActions = document.getElementById('ipfs-resource-context-actions')
const pinResourceButton = document.getElementById('pin-current-ipfs-address')
const unpinResourceButton = document.getElementById('unpin-current-ipfs-address')
const copyIpfsAddressButton = document.getElementById('copy-current-ipfs-address')
const copyPublicGwAddressButton = document.getElementById('copy-current-public-gw-url')

const enableRedirect = document.getElementById('enable-gateway-redirect')
const disableRedirect = document.getElementById('disable-gateway-redirect')
const openWebUI = document.getElementById('open-webui')
const openPreferences = document.getElementById('open-preferences')
const quickUpload = document.getElementById('quick-upload')

const ipfsIcon = document.getElementById('icon')
const ipfsIconOn = '../../icons/ipfs-logo-on.svg'
const ipfsIconOff = '../../icons/ipfs-logo-off.svg'
const offline = 'offline'

function resolv (element) {
  // lookup DOM if element is just a string ID
  if (Object.prototype.toString.call(element) === '[object String]') {
    return document.getElementById(element)
  }
  // return as-is otherwise
  return element
}

function set (id, value) {
  resolv(id).textContent = value
}

function show (element) {
  element = resolv(element)
  element.classList.remove('disabled')
  element.classList.remove('hidden')
}

function disable (element) {
  resolv(element).classList.add('disabled')
}

function hide (element) {
  resolv(element).classList.add('hidden')
}

function getBackgroundPage () {
  return browser.runtime.getBackgroundPage()
}

function getCurrentTab () {
  return browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
}

// Ipfs Context Page Actions
// ===================================================================

async function copyCurrentPublicGwAddress () {
  const bg = await getBackgroundPage()
  const currentTab = await getCurrentTab()
  const publicGwAddress = new URL(currentTab.url.replace(bg.state.gwURLString, 'https://ipfs.io/')).toString()
  copyTextToClipboard(publicGwAddress)
  bg.notify('notify_copiedPublicURLTitle', publicGwAddress)
  window.close()
}

async function copyCurrentCanonicalAddress () {
  const bg = await getBackgroundPage()
  const currentTab = await getCurrentTab()
  const rawIpfsAddress = currentTab.url.replace(/^.+(\/ip(f|n)s\/.+)/, '$1')
  copyTextToClipboard(rawIpfsAddress)
  bg.notify('notify_copiedCanonicalAddressTitle', rawIpfsAddress)
  window.close()
}

function copyTextToClipboard (copyText) {
  // lets take a moment and ponder on the state of copying a string in 2017
  const copyFrom = document.createElement('textarea')
  copyFrom.textContent = copyText
  const body = document.getElementsByTagName('body')[0]
  body.appendChild(copyFrom) // oh god why
  copyFrom.select()
  document.execCommand('copy') // srsly
  body.removeChild(copyFrom)
}

async function pinCurrentResource () {
  deactivatePinButton()
  try {
    const bg = await getBackgroundPage()
    const currentTab = await getCurrentTab()
    const currentPath = await resolveToIPFS(new URL(currentTab.url).pathname)
    const pinResult = await bg.ipfs.pin.add(currentPath, { recursive: true })
    console.log('ipfs.pin.add result', pinResult)
    bg.notify('notify_pinnedIpfsResourceTitle', currentPath)
  } catch (error) {
    handlePinError('notify_pinErrorTitle', error)
  }
  window.close()
}

async function unpinCurrentResource () {
  deactivatePinButton()
  try {
    const bg = await getBackgroundPage()
    const currentTab = await getCurrentTab()
    const currentPath = await resolveToIPFS(new URL(currentTab.url).pathname)
    const result = await bg.ipfs.pin.rm(currentPath, {recursive: true})
    console.log('ipfs.pin.rm result', result)
    bg.notify('notify_unpinnedIpfsResourceTitle', currentPath)
  } catch (error) {
    handlePinError('notify_unpinErrorTitle', error)
  }
  window.close()
}

function activatePinning () {
  pinResourceButton.onclick = pinCurrentResource
  show(pinResourceButton)
  unpinResourceButton.onclick = undefined
  hide(unpinResourceButton)
}

function activateUnpinning () {
  pinResourceButton.onclick = undefined
  unpinResourceButton.onclick = unpinCurrentResource
  hide(pinResourceButton)
  show(unpinResourceButton)
}

function deactivatePinButton () {
  pinResourceButton.onclick = undefined
  unpinResourceButton.onclick = undefined
  disable(pinResourceButton)
  hide(unpinResourceButton)
}

async function handlePinError (errorMessageKey, error) {
  console.error(browser.i18n.getMessage(errorMessageKey), error)
  deactivatePinButton()
  try {
    const bg = await getBackgroundPage()
    bg.notify(errorMessageKey, error.message)
  } catch (error) {
    console.error('unable to access background page', error)
  }
}

async function resolveToIPFS (path) {
  if (/^\/ipns/.test(path)) {
    const bg = await getBackgroundPage()
    const response = await bg.ipfs.name.resolve(path, {recursive: true, nocache: false})
    return response.Path
  }
  return path
}

async function activatePinButton () {
  try {
    const bg = await getBackgroundPage()
    const currentTab = await getCurrentTab()
    const currentPath = await resolveToIPFS(new URL(currentTab.url).pathname)
    const response = await bg.ipfs.pin.ls(currentPath, {quiet: true})
    console.log(`positive ipfs.pin.ls for ${currentPath}: ${JSON.stringify(response)}`)
    activateUnpinning()
  } catch (error) {
    if (/is not pinned/.test(error.message)) {
      console.log(`negative ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
      activatePinning()
    } else {
      console.error(`unexpected result of ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
      deactivatePinButton()
    }
  }
}

async function updatePageActions () {
  // console.log('running updatePageActions()')
  try {
    const bg = await getBackgroundPage()
    const currentTab = await getCurrentTab()
    if (bg.isIpfsPageActionsContext(currentTab.url)) {
      deactivatePinButton()
      show(ipfsContextActions)
      copyPublicGwAddressButton.onclick = copyCurrentPublicGwAddress
      copyIpfsAddressButton.onclick = copyCurrentCanonicalAddress
      activatePinButton()
    } else {
      hide(ipfsContextActions)
    }
  } catch (error) {
    console.error(`Error while setting up pageAction: ${error}`)
  }
}

// Global Actions
// ===================================================================

quickUpload.onclick = () => browser.tabs.create({ url: browser.extension.getURL('src/popup/quick-upload.html') })

enableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: true})
  .then(updateBrowserActionPopup)
  .catch(error => { console.error(`Unable to update redirect state due to ${error}`) })

disableRedirect.onclick = () => browser.storage.local.set({useCustomGateway: false})
  .then(updateBrowserActionPopup)
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

async function updateBrowserActionPopup () {
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
      // update swarm peer count
      try {
        const peerCount = background.state.peerCount
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
      // update gateway version
      try {
        const v = await background.ipfs.version()
        set('gateway-version-val', (v.commit ? v.version + '/' + v.commit : v.version))
      } catch (error) {
        set('gateway-version-val', offline)
      }
    }
  } catch (error) {
    console.error(`Error while accessing background page: ${error}`)
  }
}

// hide things that cause ugly reflow if removed later
hide(ipfsContextActions)
hide('quick-upload')
hide('open-webui')

// listen to any changes and update diagnostics
browser.alarms.onAlarm.addListener(updateBrowserActionPopup)
document.addEventListener('DOMContentLoaded', updatePageActions)
document.addEventListener('DOMContentLoaded', updateBrowserActionPopup)
