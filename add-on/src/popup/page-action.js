'use strict'
/* eslint-env browser, webextensions */

const pinResourceButton = document.getElementById('pin-current-ipfs-address')
const unpinResourceButton = document.getElementById('unpin-current-ipfs-address')
const copyIpfsAddressButton = document.getElementById('copy-current-ipfs-address')
const copyPublicGwAddressButton = document.getElementById('copy-current-public-gw-url')

function show (element) {
  element.classList.remove('faded')
  element.classList.remove('hidden')
}

function fade (element) {
  element.classList.add('faded')
}

function hide (element) {
  element.classList.add('hidden')
}

async function getBackgroundPage () {
  return browser.runtime.getBackgroundPage()
}

async function getCurrentTab () {
  return browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
}

async function copyCurrentPublicGwAddress () {
  const bg = await getBackgroundPage()
  const currentTab = await getCurrentTab()
  const publicGwAddress = new URL(currentTab.url.replace(bg.state.gwURLString, 'https://ipfs.io/')).toString()
  copyTextToClipboard(publicGwAddress)
  bg.notify('Copied Public URL', publicGwAddress) // TODO: i18
  window.close()
}

async function copyCurrentCanonicalAddress () {
  const bg = await getBackgroundPage()
  const currentTab = await getCurrentTab()
  const rawIpfsAddress = currentTab.url.replace(/^.+(\/ip(f|n)s\/.+)/, '$1')
  copyTextToClipboard(rawIpfsAddress)
  bg.notify('Copied Canonical Address', rawIpfsAddress) // TODO: i18
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
    bg.notify('Pinned IPFS Resource', currentPath) // TODO: i18
  } catch (error) {
    handlePinError('Error while pinning', error)
  }
  window.close()
}

async function unpinCurrentResource () {
  deactivatePinButton()
  try {
    const bg = await getBackgroundPage()
    const currentTab = await getCurrentTab()
    const currentPath = await resolveToIPFS(new URL(currentTab.url).pathname)
    const result = await bg.ipfs.pin.rm(currentPath)
    console.log('ipfs.pin.rm result', result)
    bg.notify('Removed IPFS Pin', currentPath) // TODO: i18
  } catch (error) {
    handlePinError('Error while unpinning', error)
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
  fade(pinResourceButton)
  hide(unpinResourceButton)
}

async function handlePinError (errorMessage, error) {
  console.error(errorMessage, error)
  deactivatePinButton()
  try {
    const bg = await getBackgroundPage()
    bg.notify(errorMessage, error.message) // TODO: i18
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

function initPageAction () {
  console.log('running initPageAction()')
  try {
    deactivatePinButton()
    copyPublicGwAddressButton.onclick = copyCurrentPublicGwAddress
    copyIpfsAddressButton.onclick = copyCurrentCanonicalAddress
    return activatePinButton()
  } catch (error) {
    console.error(`Error while setting up pageAction: ${error}`)
  }
}

document.addEventListener('DOMContentLoaded', initPageAction)
