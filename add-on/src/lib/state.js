'use strict'
/* eslint-env browser, webextensions */

const { safeURL } = require('./options')
const offlinePeerCount = -1

function initState (options) {
  // we store options and some pregenerated values to avoid async storage
  // reads and minimize performance impact on overall browsing experience
  const state = Object.assign({}, options)
  // generate some additional values
  state.peerCount = offlinePeerCount
  state.pubGwURL = safeURL(options.publicGatewayUrl)
  state.pubGwURLString = state.pubGwURL.toString()
  delete state.publicGatewayUrl
  state.redirect = options.useCustomGateway
  delete state.useCustomGateway
  state.apiURL = safeURL(options.ipfsApiUrl)
  state.apiURLString = state.apiURL.toString()
  delete state.ipfsApiUrl
  state.gwURL = safeURL(options.customGatewayUrl)
  state.gwURLString = state.gwURL.toString()
  delete state.customGatewayUrl
  state.dnslinkPolicy = String(options.dnslinkPolicy) === 'false' ? false : options.dnslinkPolicy
  // store info about 'blessed' release of Web UI
  // which should work without setting CORS headers
  state.webuiCid = 'QmXc9raDM1M5G5fpBnVyQ71vR4gbnskwnB9iMEzBuLgvoZ' // v2.3.3
  state.webuiRootUrl = `${state.gwURLString}ipfs/${state.webuiCid}/`
  return state
}

exports.initState = initState
exports.offlinePeerCount = offlinePeerCount
