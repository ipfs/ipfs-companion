'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import { optionDefaults } from '../lib/options.js'
import { DELETE_RULE_REQUEST_SUCCESS, RULE_REGEX_ENDING, notifyDeleteRule, notifyOptionChange } from '../lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../lib/runtime-checks.js'

// The store contains and mutates the state for the app
export default function optionStore (state, emitter) {
  state.options = optionDefaults

  const fetchRedirectRules = async () => {
    const existingRedirectRules = await browser.declarativeNetRequest.getDynamicRules()
    state.redirectRules = existingRedirectRules.map(rule => ({
      id: rule.id,
      origin: rule.condition.regexFilter?.replace(RULE_REGEX_ENDING, '(.*)').replaceAll('\\', ''),
      target: rule.action.redirect?.regexSubstitution
    }))
    emitter.emit('render')
  }

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
    browser.runtime.sendMessage({ telemetry: { trackView: 'options' } })
    updateStateOptions()
    fetchRedirectRules()
    browser.storage.onChanged.addListener(updateStateOptions)
  })

  emitter.on('redirectRuleDeleteRequest', async (id) => {
    console.log('delete rule request', id)
    browser.runtime.onMessage.addListener(({ type }) => {
      if (type === DELETE_RULE_REQUEST_SUCCESS) {
        emitter.emit('render')
      }
    })
    notifyDeleteRule(id)
  })

  emitter.on('optionChange', async ({ key, value }) => {
    browser.storage.local.set({ [key]: value })
    await notifyOptionChange()
  })

  emitter.on('optionsReset', async () => {
    browser.storage.local.set(optionDefaults)
    await notifyOptionChange()
  })
}

async function getOptions () {
  const storedOpts = await browser.storage.local.get()
  return Object.keys(optionDefaults).reduce((opts, key) => {
    opts[key] = storedOpts[key] == null ? optionDefaults[key] : storedOpts[key]
    return opts
  }, {})
}
