'use strict'
/* eslint-env browser, webextensions */

const offlinePeerCount = -1

function initState (options) {
  const state = {}
  // we store the most used values in optimized form
  // to minimize performance impact on overall browsing experience
  state.active = options.active
  state.peerCount = offlinePeerCount
  state.ipfsNodeType = options.ipfsNodeType
  state.ipfsNodeConfig = options.ipfsNodeConfig
  state.pubGwURL = new URL(options.publicGatewayUrl)
  state.pubGwURLString = state.pubGwURL.toString()
  state.redirect = options.useCustomGateway
  state.apiURL = new URL(options.ipfsApiUrl)
  state.apiURLString = state.apiURL.toString()
  state.gwURL = new URL(options.customGatewayUrl)
  state.gwURLString = state.gwURL.toString()
  state.automaticMode = options.automaticMode
  state.linkify = options.linkify
  state.dnslink = options.dnslink
  state.preloadAtPublicGateway = options.preloadAtPublicGateway
  state.catchUnhandledProtocols = options.catchUnhandledProtocols
  state.displayNotifications = options.displayNotifications
  state.ipfsProxy = options.ipfsProxy
  return state
}

exports.initState = initState
exports.offlinePeerCount = offlinePeerCount
