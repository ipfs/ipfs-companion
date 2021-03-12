'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const { optionDefaults } = require('../lib/options')
const { createRuntimeChecks } = require('../lib/runtime-checks')

// The store contains and mutates the state for the app
module.exports = (state, emitter) => {
  state.options = optionDefaults

  const updateStateOptions = async () => {
    const runtime = await createRuntimeChecks(browser)
    state.withNodeFromBrave = runtime.brave && await runtime.brave.getIPFSEnabled()
    state.options = await getOptions()
    emitter.emit('render')
  }

  emitter.on('DOMContentLoaded', async () => {
    updateStateOptions()
    browser.storage.onChanged.addListener(updateStateOptions)
  })

  emitter.on('optionChange', ({ key, value }) => (
    browser.storage.local.set({ [key]: value })
  ))

  emitter.on('optionsReset', () => (
    browser.storage.local.set(optionDefaults)
  ))
}

async function getOptions () {
  const storedOpts = await browser.storage.local.get()
  return Object.keys(optionDefaults).reduce((opts, key) => {
    opts[key] = storedOpts[key] == null ? optionDefaults[key] : storedOpts[key]
    return opts
  }, {})
}
