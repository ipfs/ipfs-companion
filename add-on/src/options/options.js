'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { optionDefaults, normalizeGatewayURL } = require('../lib/options')
const translateDataAttrs = require('../lib/data-i18n')

translateDataAttrs()

async function saveOption (name) {
  const element = document.querySelector(`#${name}`)
  if (!element.reportValidity()) {
    console.warn('[ipfs-companion] Invalid value for option: ' + name)
    return
  }
  if (element) {
    const change = {}
    switch (element.type) {
      case 'text':
      case 'number':
        change[name] = element.value
        break
      case 'url':
        change[name] = normalizeGatewayURL(element.value)
        break
      case 'textarea':
        // normalize input into a string of entries separated by a single space
        change[name] = element.value.replace(/[\r\n,;]+/g, ' ').replace(/ +(?= )/g, '').trim()
        break
      case 'checkbox':
        change[name] = element.checked
        break
      default:
        console.log('Unsupported option type: ' + element.type)
    }
    await browser.storage.local.set(change)
  }
}

async function readOption (name) {
  const element = document.querySelector(`#${name}`)
  if (element) {
    try {
      const storage = await browser.storage.local.get(name)
      const oldValue = storage[name]
      switch (element.type) {
        case 'text':
        case 'url':
          element.value = oldValue
          break
        case 'textarea':
          element.onfocusout = () => saveOption(name)
          // display every entry in a new line
          element.value = oldValue.trim().split(' ').join('\n')
          break
        case 'number':
          // handle number change via mouse + widget controls
          element.onclick = () => saveOption(name)
          element.value = oldValue
          break
        case 'checkbox':
          element.checked = typeof (oldValue) === 'boolean' ? oldValue : false
          break
        default:
          console.log('Unsupported option type: ' + element.type)
      }
      element.onblur = () => saveOption(name) // autosave
    } catch (error) {
      console.error(`Unable to initialize oprions due to ${error}`)
    }
  }
}

function readAllOptions () {
  Object.keys(optionDefaults).map(key => readOption(key))
}

function resetAllOptions (event) {
  // go over every key and set its value to a default one
  Object.keys(optionDefaults).map(async key => {
    const change = {}
    change[key] = optionDefaults[key]
    await browser.storage.local.set(change)
    readOption(key)
  })
  window.scrollTo(0, 0)
  event.target.disabled = true
  setTimeout(() => { event.target.disabled = false }, 3000)
  event.preventDefault()
}

// initial load
document.addEventListener('DOMContentLoaded', () => {
  readAllOptions()
  document.querySelector('#resetAllOptions > button').addEventListener('click', resetAllOptions)
})

// update on external changes such as browserAction menu
browser.storage.onChanged.addListener(readAllOptions)
