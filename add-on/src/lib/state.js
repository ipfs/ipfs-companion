'use strict'
/* eslint-env browser, webextensions */

const { safeURL } = require('./options')
const offlinePeerCount = -1

// CID of a 'blessed' Web UI release
// which should work without setting CORS headers
const webuiCid = 'Qmexhq2sBHnXQbvyP2GfUdbnY7HCagH2Mw5vUNSBn2nxip' // v2.7.2

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
  state.gwURL = safeURL(options.customGatewayUrl, { useLocalhostName: state.useSubdomainProxy })
  state.gwURLString = state.gwURL.toString()
  delete state.customGatewayUrl
  state.dnslinkPolicy = String(options.dnslinkPolicy) === 'false' ? false : options.dnslinkPolicy
  state.webuiCid = webuiCid

  // TODO: unify the way webui is opened
  // - https://github.com/ipfs-shipyard/ipfs-companion/pull/737
  // - https://github.com/ipfs-shipyard/ipfs-companion/pull/738
  // Context: previously, we loaded webui from gateway port
  // (`${state.gwURLString}ipfs/${state.webuiCid}/`) because API port
  // has hardcoded list of whitelisted webui versions.
  // To enable API access from webui loaded from Gateway port Companion
  // removed Origin header to avoid CORS, now we move away from that
  // complexity and for now just load version whitelisted on API port.
  // In the future, we want to load webui from $webuiCid.ipfs.localhost
  // and whitelist API access from that specific hostname
  // by appending it to API.HTTPHeaders.Access-Control-Allow-Origin list
  // When that is possible, we can remove Origin manipulation (see PR #737 for PoC)
  state.webuiRootUrl = `${state.apiURLString}webui/`

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
  // apply optional overrides
  if (overrides) Object.assign(state, overrides)
  return state
}

exports.initState = initState
exports.offlinePeerCount = offlinePeerCount
exports.webuiCid = webuiCid
