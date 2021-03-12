'use strict'
/* eslint-env browser, webextensions */

const { safeURL, isHostname } = require('./options')
const offlinePeerCount = -1

function initState (options, overrides) {
  // we store options and some pregenerated values to avoid async storage
  // reads and minimize performance impact on overall browsing experience
  const state = Object.assign({}, options)
  // generate some additional values
  state.peerCount = offlinePeerCount
  state.pubGwURL = safeURL(options.publicGatewayUrl)
  state.pubGwURLString = state.pubGwURL.toString()
  delete state.publicGatewayUrl
  state.pubSubdomainGwURL = safeURL(options.publicSubdomainGatewayUrl)
  state.pubSubdomainGwURLString = state.pubSubdomainGwURL.toString()
  delete state.publicSubdomainGatewayUrl
  state.redirect = options.useCustomGateway
  delete state.useCustomGateway
  state.apiURL = safeURL(options.ipfsApiUrl, { useLocalhostName: false }) // go-ipfs returns 403 if IP is beautified to 'localhost'
  state.apiURLString = state.apiURL.toString()
  delete state.ipfsApiUrl
  state.gwURL = safeURL(options.customGatewayUrl, { useLocalhostName: state.useSubdomains })
  state.gwURLString = state.gwURL.toString()
  delete state.customGatewayUrl
  state.dnslinkPolicy = String(options.dnslinkPolicy) === 'false' ? false : options.dnslinkPolicy

  // attach helper functions
  state.activeIntegrations = (url) => {
    if (!state.active) return false
    try {
      const hostname = isHostname(url) ? url : new URL(url).hostname
      // opt-out has more weight, we also match parent domains
      const disabledDirectlyOrIndirectly = state.disabledOn.some(optout => hostname.endsWith(optout))
      // ..however direct opt-in should overwrite parent's opt-out
      const enabledDirectly = state.enabledOn.some(optin => optin === hostname)
      return !(disabledDirectlyOrIndirectly && !enabledDirectly)
    } catch (_) {
      return false
    }
  }
  // TODO state.connected ~= state.peerCount > 0
  // TODO state.nodeActive ~= API is online,eg. state.peerCount > offlinePeerCount
  Object.defineProperty(state, 'localGwAvailable', {
    // TODO: make quick fetch to confirm it works?
    get: function () { return this.ipfsNodeType !== 'embedded' }
  })
  Object.defineProperty(state, 'webuiRootUrl', {
    get: function () {
      // Did user opt-in for rolling release published on DNSLink?
      if (state.useLatestWebUI) return `${state.gwURLString}ipns/webui.ipfs.io/`
      return `${state.apiURLString}webui`
    }
  })
  // apply optional overrides
  if (overrides) Object.assign(state, overrides)
  return state
}

exports.initState = initState
exports.offlinePeerCount = offlinePeerCount
