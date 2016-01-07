'use strict';

const {
  Cc, Ci
} = require('chrome');


const prefs = require('sdk/simple-prefs').prefs;
const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);

const IPFS_RESOURCE = /^https?:\/\/[^\/]+\/ip(f|n)s\//;

exports.IPFS_RESOURCE = IPFS_RESOURCE;

var PUBLIC_GATEWAY_HOSTS; // getPublicGatewayHostsRegex()
var PUBLIC_GATEWAY_URI; // getDefaultPublicURI();
var CUSTOM_GATEWAY_URI;

function getPublicGatewayHostList() {
  return prefs.publicGatewayHosts.split(/,|;| |\|/);
}

function getDefaultPublicURI() {
  var hosts = getPublicGatewayHostList();
  return ioservice.newURI('https://' + hosts[0], null, null);
}

function getPublicGatewayHostsRegex() {
  var hosts = getPublicGatewayHostList();
  var hostsRegex = '';
  for (var i = 0; i < hosts.length; i++) {
    if (i > 0) {
      hostsRegex += '|';
    }
    hostsRegex += hosts[i].trim().replace(/[^\w\s]/g, '\\$&');
  }
  return new RegExp('^https?:\/\/(' + hostsRegex + ')\/');
}


const callbacks = [];

const reloadMetaPreferences = (function f(changedProperty) { // eslint-disable-line no-unused-vars
  // public gateways
  PUBLIC_GATEWAY_URI = getDefaultPublicURI();
  PUBLIC_GATEWAY_HOSTS = getPublicGatewayHostsRegex();

  // custom gateway
  CUSTOM_GATEWAY_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customGatewayPort, null, null);

  callbacks.forEach((c) => c());

  return f;
})(); // define & execute
require('sdk/simple-prefs').on('', reloadMetaPreferences);
exports.reload = reloadMetaPreferences;

// Executes function right now (init)
// and every time preferences are changed
exports.onPreferencesChange = (f) => {
  f();
  callbacks.push(f);
};


exports.customUri = function() {
  return CUSTOM_GATEWAY_URI;
};
exports.publicUri = function() {
  return PUBLIC_GATEWAY_URI;
};
exports.publicHosts = function() {
  return PUBLIC_GATEWAY_HOSTS;
};

Object.defineProperty(exports, 'redirectEnabled', {
  get: function() {
    return prefs.useCustomGateway;
  },
  set: function(value) {
    prefs.useCustomGateway = !!value;
  }
});

Object.defineProperty(exports, 'linkify', {
  get: function() {
    return prefs.linkify;
  }
});
