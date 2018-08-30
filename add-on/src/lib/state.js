'use strict'
/* eslint-env browser, webextensions */

const offlinePeerCount = -1

function initState (options) {
  // we store options and some pregenerated values to avoid async storage
  // reads and minimize performance impact on overall browsing experience
  const state = Object.assign({}, options)
  // generate some additional values
  state.peerCount = offlinePeerCount
  state.pubGwURL = new URL(options.publicGatewayUrl)
  state.pubGwURLString = state.pubGwURL.toString()
  state.redirect = options.useCustomGateway
  state.apiURL = new URL(options.ipfsApiUrl)
  state.apiURLString = state.apiURL.toString()
  state.gwURL = new URL(options.customGatewayUrl)
  state.gwURLString = state.gwURL.toString()
  state.dnslinkPolicy = String(options.dnslinkPolicy) === 'false' ? false : options.dnslinkPolicy
  return state
}

exports.initState = initState
exports.offlinePeerCount = offlinePeerCount
