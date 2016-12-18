'use strict'
/* eslint-env browser, webextensions */
/* global optionDefaults */

function saveOption (name) {
  const element = document.querySelector(`#${name}`)
  if (element) {
    const change = {}
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
    browser.storage.local.set(change)
  }
}

function readOption (name) {
  const element = document.querySelector(`#${name}`)
  if (element) {
    browser.storage.local.get(name)
      .then(storage => {
        if (browser.runtime.lastError) {
          console.log(browser.runtime.lastError)
        } else {
          const oldValue = storage[name]
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
          element.onblur = () => saveOption(name) // autosave
        }
      })
  }
}

function readAllOptions () {
  Object.keys(optionDefaults).map(key => readOption(key))
}

document.addEventListener('DOMContentLoaded', readAllOptions)
