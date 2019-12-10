'use strict'
/* eslint-env browser, webextensions */

const html = require('choo/html')
const globalToggleForm = require('./forms/global-toggle-form')
const ipfsNodeForm = require('./forms/ipfs-node-form')
const fileImportForm = require('./forms/file-import-form')
const dnslinkForm = require('./forms/dnslink-form')
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
    if (modifyValue) {
      emit('render')
    }
  }

  const onOptionsReset = (e) => {
    e.preventDefault()
    emit('optionsReset')
  }

  if (!state.options.active) {
    // we don't want to confuse users by showing "active" checkboxes
    // when global toggle is in "suspended" state
    return html`
    <div class="sans-serif">
  ${globalToggleForm({
    active: state.options.active,
    onOptionChange
  })}
    </div>
    `
  }
  return html`
    <div class="sans-serif">
  ${globalToggleForm({
    active: state.options.active,
    onOptionChange
  })}
  ${ipfsNodeForm({
    ipfsNodeType: state.options.ipfsNodeType,
    ipfsNodeConfig: state.options.ipfsNodeConfig,
    onOptionChange
  })}
  ${state.options.ipfsNodeType === 'external' ? apiForm({
    ipfsApiUrl: state.options.ipfsApiUrl,
    ipfsApiPollMs: state.options.ipfsApiPollMs,
    automaticMode: state.options.automaticMode,
    onOptionChange
  }) : null}
  ${gatewaysForm({
    ipfsNodeType: state.options.ipfsNodeType,
    customGatewayUrl: state.options.customGatewayUrl,
    useCustomGateway: state.options.useCustomGateway,
    publicGatewayUrl: state.options.publicGatewayUrl,
    publicSubdomainGatewayUrl: state.options.publicSubdomainGatewayUrl,
    noIntegrationsHostnames: state.options.noIntegrationsHostnames,
    onOptionChange
  })}
  ${fileImportForm({
    importDir: state.options.importDir,
    openViaWebUI: state.options.openViaWebUI,
    preloadAtPublicGateway: state.options.preloadAtPublicGateway,
    onOptionChange
  })}
  ${dnslinkForm({
    dnslinkPolicy: state.options.dnslinkPolicy,
    dnslinkDataPreload: state.options.dnslinkDataPreload,
    dnslinkRedirect: state.options.dnslinkRedirect,
    onOptionChange
  })}
  ${experimentsForm({
    displayNotifications: state.options.displayNotifications,
    catchUnhandledProtocols: state.options.catchUnhandledProtocols,
    linkify: state.options.linkify,
    recoverFailedHttpRequests: state.options.recoverFailedHttpRequests,
    detectIpfsPathHeader: state.options.detectIpfsPathHeader,
    ipfsProxy: state.options.ipfsProxy,
    logNamespaces: state.options.logNamespaces,
    onOptionChange,
    onOptionsReset
  })}
    </div>
  `
}
