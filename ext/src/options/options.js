'use strict'
/* eslint-env webextensions */

var options = new Set() // TODO: load list from background.js?
options.add('publicGateways')
options.add('useCustomGateway')
options.add('customGatewayUrl')
options.add('ipfsApiUrl')

function saveOption (name) {
  let element = document.querySelector(`#${name}`)
  let change = {}
  switch (element.type) {
    case 'text':
    case 'url':
      change[name] = element.value
      break
    case 'checkbox':
      change[name] = element.checked
      break
    default:
      console.log('Unsupported option type: ' + element.type)
  }
  chrome.storage.local.set(change)
}

function readOption (name) {
  let element = document.querySelector(`#${name}`)
  chrome.storage.local.get(name, (storage) => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError)
    } else {
      let oldValue = storage[name]
      switch (element.type) {
        case 'text':
        case 'url':
          element.value = oldValue
          break
        case 'checkbox':
          element.checked = typeof (oldValue) === 'boolean' ? oldValue : false
          break
        default:
          console.log('Unsupported option type: ' + element.type)
      }
    }
  })
}

function saveOptions (e) {
  for (let option of options) {
    saveOption(option)
  }
}

function readOptions () {
  for (let option of options) {
    readOption(option)
  }
}

document.addEventListener('DOMContentLoaded', readOptions)

// TODO: remove button and save automatically (eg. on leaving input)
document.querySelector('form').addEventListener('submit', saveOptions)
