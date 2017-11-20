'use strict'
/* eslint-env browser */

function initState (options) {
  const state = {}
  // we store the most used values in optimized form
  // to minimize performance impact on overall browsing experience
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
  return state
}

exports.initState = initState
