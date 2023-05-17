'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import { optionDefaults } from '../lib/options.js'
import { GLOBAL_STATE_OPTION_CHANGE } from '../lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../lib/runtime-checks.js'
import { handleConsentFromState, trackView } from '../lib/telemetry.js'

// The store contains and mutates the state for the app
export default function optionStore (state, emitter) {
  state.options = optionDefaults

  const updateStateOptions = async () => {
    const runtime = await createRuntimeChecks(browser)
    state.withNodeFromBrave = runtime.brave && await runtime.brave.getIPFSEnabled()
    /**
     * FIXME: Why are we setting `state.options` when state is supposed to extend options?
     */
    state.options = await getOptions()
    emitter.emit('render')
  }

  emitter.on('DOMContentLoaded', async () => {
    handleConsentFromState(state)
    trackView('options')
    updateStateOptions()
    browser.storage.onChanged.addListener(updateStateOptions)
  })

  emitter.on('optionChange', async ({ key, value }) => {
    browser.storage.local.set({ [key]: value })
    await browser.runtime.sendMessage({ type: GLOBAL_STATE_OPTION_CHANGE })
  })

  emitter.on('optionsReset', async () => {
    browser.storage.local.set(optionDefaults)
    await browser.runtime.sendMessage({ type: GLOBAL_STATE_OPTION_CHANGE })
  })
}

async function getOptions () {
  const storedOpts = await browser.storage.local.get()
  return Object.keys(optionDefaults).reduce((opts, key) => {
    opts[key] = storedOpts[key] == null ? optionDefaults[key] : storedOpts[key]
    return opts
  }, {})
}
