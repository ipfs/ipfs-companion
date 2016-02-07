'use strict'

const {Cc, Ci} = require('chrome')

const prefs = require('sdk/simple-prefs').prefs
const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)

// TODO: replace regex with 3rd party library provided by IPFS community
// Ref. https://github.com/ipfs/notes/issues/92#issuecomment-172135885
const IPFS_RESOURCE = /^https?:\/\/[^\/]+\/(ipns\/[^\/]+\.[^\/]+|ipfs\/Qm[1-9A-HJ-NP-Za-km-z]{44})/

exports.IPFS_RESOURCE = IPFS_RESOURCE

var PUBLIC_GATEWAY_HOSTS // getPublicGatewayHostsRegex()
var PUBLIC_GATEWAY_URI // getDefaultPublicURI()
var CUSTOM_GATEWAY_URI
var CUSTOM_API_URI

function getPublicGatewayHostList () {
  return prefs.publicGatewayHosts.split(/,|;| |\|/)
}

function getDefaultPublicURI () {
  var hosts = getPublicGatewayHostList()
  return ioservice.newURI('https://' + hosts[0], null, null)
}

function getPublicGatewayHostsRegex () {
  var hosts = getPublicGatewayHostList()
  var hostsRegex = ''
  for (var i = 0; i < hosts.length; i++) {
    if (i > 0) {
      hostsRegex += '|'
    }
    hostsRegex += hosts[i].trim().replace(/[^\w\s]/g, '\\$&')
  }
  return new RegExp('^https?:\/\/(' + hostsRegex + ')\/')
}

const callbacks = []

exports.reload = (function f (changedProperty) { // eslint-disable-line no-unused-vars
  // public gateways
  PUBLIC_GATEWAY_URI = getDefaultPublicURI()
  PUBLIC_GATEWAY_HOSTS = getPublicGatewayHostsRegex()

  // custom gateway
  CUSTOM_GATEWAY_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customGatewayPort, null, null)
  CUSTOM_API_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customApiPort, null, null)

  callbacks.forEach((c) => c())

  return f
})() // define & execute once

// execute on each Preference change
require('sdk/simple-prefs').on('', exports.reload)

// execute function and add it to callback list
exports.onPreferencesChange = (f) => {
  f()
  callbacks.push(f)
}

exports.isPinnable = (uriSpec) => {
  return uriSpec && uriSpec.match(IPFS_RESOURCE) != null && !uriSpec.startsWith(CUSTOM_API_URI.spec)
}

Object.defineProperty(exports, 'customUri', {
  get: function () {
    return CUSTOM_GATEWAY_URI
  }
})

Object.defineProperty(exports, 'apiUri', {
  get: function () {
    return CUSTOM_API_URI
  }
})

Object.defineProperty(exports, 'publicUri', {
  get: function () {
    return PUBLIC_GATEWAY_URI
  }
})

Object.defineProperty(exports, 'publicHosts', {
  get: function () {
    return PUBLIC_GATEWAY_HOSTS
  }
})

Object.defineProperty(exports, 'redirectEnabled', {
  get: function () {
    return prefs.useCustomGateway
  },
  set: function (value) {
    prefs.useCustomGateway = !!value
  }
})

Object.defineProperty(exports, 'linkify', {
  get: function () {
    return prefs.linkify
  }
})
