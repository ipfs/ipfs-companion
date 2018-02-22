'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const ipfsNodeForm = require('./forms/ipfs-node-form')
const gatewaysForm = require('./forms/gateways-form')
const apiForm = require('./forms/api-form')
const experimentsForm = require('./forms/experiments-form')

// Render the options page:
// Passed current app `state` from the store and `emit`, a function to create
// events, allowing views to signal back to the store that something happened.
module.exports = function optionsPage (state, emit) {
  const onOptionChange = (key, modifyValue) => (e) => {
    e.preventDefault()

    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value

    if (!e.target.reportValidity()) {
      return console.warn(`[ipfs-companion] Invalid value for ${key}: ${value}`)
    }

    emit('optionChange', { key, value: modifyValue ? modifyValue(value) : value })
  }

  const onOptionsReset = (e) => {
    e.preventDefault()
    emit('optionsReset')
  }

  return html`
    <div>
      ${ipfsNodeForm({
        ipfsNodeType: state.options.ipfsNodeType,
        ipfsNodeConfig: state.options.ipfsNodeConfig,
        onOptionChange
      })}
      ${gatewaysForm({
        customGatewayUrl: state.options.customGatewayUrl,
        useCustomGateway: state.options.useCustomGateway,
        publicGatewayUrl: state.options.publicGatewayUrl,
        onOptionChange
      })}
      ${apiForm({
        ipfsApiUrl: state.options.ipfsApiUrl,
        ipfsApiPollMs: state.options.ipfsApiPollMs,
        automaticMode: state.options.automaticMode,
        onOptionChange
      })}
      ${experimentsForm({
        displayNotifications: state.options.displayNotifications,
        preloadAtPublicGateway: state.options.preloadAtPublicGateway,
        catchUnhandledProtocols: state.options.catchUnhandledProtocols,
        linkify: state.options.linkify,
        dnslink: state.options.dnslink,
        ipfsProxy: state.options.ipfsProxy,
        onOptionChange,
        onOptionsReset
      })}
    </div>
  `
}
