'use strict'
/* eslint-env browser, webextensions */
/* global optionDefaults */

async function saveOption (name) {
  const element = document.querySelector(`#${name}`)
  if (element) {
    const change = {}
    switch (element.type) {
      case 'text':
      case 'number':
      case 'url':
        change[name] = element.value
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

// initial load
document.addEventListener('DOMContentLoaded', readAllOptions)

// update on external changes such as browserAction menu
browser.storage.onChanged.addListener(readAllOptions)
