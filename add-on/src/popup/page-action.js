'use strict'
/* eslint-env browser, webextensions */

const pinResource = document.getElementById('pin-current-ipfs-address')
const unpinResource = document.getElementById('unpin-current-ipfs-address')
const copyIpfsAddress = document.getElementById('copy-current-ipfs-address')
const copyPublicGwAddress = document.getElementById('copy-current-public-gw-url')

function show (element) {
  element.classList.remove('hidden')
}

function hide (element) {
  element.classList.add('hidden')
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

function initPageAction () {
  console.log('running initPageAction()')
  return browser.tabs.query({active: true, currentWindow: true})
    .then(tabs => {
      const currentTab = tabs[0]
      const currentPath = new URL(currentTab.url).pathname

      return browser.runtime.getBackgroundPage()
        .then(bg => {
          copyPublicGwAddress.onclick = () => {
            const publicGwAddress = new URL(currentTab.url.replace(bg.state.gwURLString, 'https://ipfs.io')).toString()
            copyTextToClipboard(publicGwAddress)
            bg.notify('Copied Public URL', publicGwAddress) // TODO: i18
            window.close()
          }

          copyIpfsAddress.onclick = () => {
            const rawIpfsAddress = currentTab.url.replace(/^.+(\/ip(f|n)s\/.+)/, '$1')
            copyTextToClipboard(rawIpfsAddress)
            bg.notify('Copied Canonical Address', rawIpfsAddress) // TODO: i18
            window.close()
          }

          // check pin status to decide which action to display
          return bg.ipfs.pin.ls({arg: currentPath, quiet: true})
            .then(response => {
              console.log(`positive ipfs.pin.ls for ${currentPath}: ${JSON.stringify(response)}`)

              show(unpinResource)
              unpinResource.onclick = () => {
                bg.ipfs.pin.rm(currentPath)
                  .then(result => {
                    console.log('ipfs.pin.rm result', result)
                    bg.notify('Removed IPFS Pin', currentPath) // TODO: i18
                  })
                  .catch(error => {
                    console.error(`Error while unpinning ${currentPath}`, error)
                    bg.notify('Error while unpinning', JSON.stringify(error)) // TODO: i18
                  })
                  .then(() => window.close())
              }
            })
            .catch(error => {
              console.log(`negative ipfs.pin.ls: ${error} (${JSON.stringify(error)})`)
              if (/is not pinned/.test(error.message)) {
                show(pinResource)
                pinResource.onclick = () => {
                  bg.ipfs.pin.add(currentPath)
                    .then(result => {
                      console.log('ipfs.pin.add result', result)
                      bg.notify('Pinned IPFS Resource', currentPath) // TODO: i18
                    })
                    .catch(error => {
                      console.error(`Error while pinning ${currentPath}`, error)
                      bg.notify('Error while pinning', JSON.strinfigy(error)) // TODO: i18
                    })
                    .then(() => window.close())
                }
              }
            })
        })
    })
    .catch(error => {
      console.error(`Error while setting up pageAction: ${error}`)
    })
}

hide(pinResource)
hide(unpinResource)
document.addEventListener('DOMContentLoaded', initPageAction)
