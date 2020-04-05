'use strict'
/* eslint-env browser, webextensions */

const { safeURL } = require('./options')
const { precachedWebuiCid } = require('./precache')
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
      const fqdn = new URL(url).hostname
      return !(state.noIntegrationsHostnames.find(host => fqdn.endsWith(host)))
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
      // Below is needed to make webui work for embedded js-ipfs
      // TODO: revisit if below is still needed after upgrading to js-ipfs >= 44
      const webuiUrl = state.ipfsNodeType === 'embedded:chromesockets'
        ? `${state.gwURLString}ipfs/${precachedWebuiCid}/`
        : `${state.apiURLString}webui`
      return webuiUrl
    }
  })
  // apply optional overrides
  if (overrides) Object.assign(state, overrides)
  return state
}

exports.initState = initState
exports.offlinePeerCount = offlinePeerCount
