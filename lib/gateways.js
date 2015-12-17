'use strict';

var {
  Cc, Ci
} = require('chrome');


var prefs = require('sdk/simple-prefs').prefs;
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);

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

function reloadCachedProperties(changedProperty) { // jshint unused:false
  // public gateways
  PUBLIC_GATEWAY_URI = getDefaultPublicURI();
  PUBLIC_GATEWAY_HOSTS = getPublicGatewayHostsRegex();

  // custom gateway
  CUSTOM_GATEWAY_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customGatewayPort, null, null);

  callbacks.forEach((c) => c());
}

require('sdk/simple-prefs').on('', reloadCachedProperties);
reloadCachedProperties();


function isEnabled() {
  return prefs.useCustomGateway;
}

exports.isEnabled = isEnabled;

exports.toggle = function(val) {
  prefs.useCustomGateway = !!val;
};


exports.onChange = (f) => {
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
