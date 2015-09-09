'use strict';

var {
  Cc, Ci
} = require('chrome');

var cm = require('sdk/context-menu');
var prefs = require('sdk/simple-prefs').prefs;
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var gui = require('./gui.js');
var proto = require('./protocols.js');

const PUBLIC_GATEWAY_URI   = ioservice.newURI('https://ipfs.io', null, null);
const PUBLIC_GATEWAY_REGEX = /^https?:\/\/(gateway\.|)ipfs\.io\//;
const PUBLIC_IPFS_RESOURCE = /^https?:\/\/(gateway\.|)ipfs\.io\/ip(fs|ns)\//;
var CUSTOM_GATEWAY_URI;


var ipfsRequestObserver = {
  observe: function(subject, topic, data) { // jshint unused:false
    if (topic == 'http-on-modify-request') {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);
      let httpUrl = channel.URI.spec;
      if (httpUrl.match(PUBLIC_IPFS_RESOURCE)) {
        channel.setRequestHeader('x-ipfs-firefox-addon', 'true', false);
        if (prefs.useCustomGateway) {
          //console.info('Detected HTTP request to the public gateway: ' + channel.URI.spec);
          let uri = ioservice.newURI(httpUrl.replace(PUBLIC_GATEWAY_REGEX, CUSTOM_GATEWAY_URI.spec), null, null);
          //console.info('Redirecting to custom gateway: ' + uri.spec);
          channel.redirectTo(uri);
        }
      }
    }
  },
  get observerService() {
    return Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
  },
  register: function() {
    this.observerService.addObserver(this, 'http-on-modify-request', false);
  },

  unregister: function() {
    this.observerService.removeObserver(this, 'http-on-modify-request');
  }
};

function reloadCachedProperties(changedProperty) { // jshint unused:false
  let menuItemContext = gui.getMenuItemContext();
  if (CUSTOM_GATEWAY_URI) {
    menuItemContext.remove(cm.URLContext(CUSTOM_GATEWAY_URI.spec + proto.ipfsScheme + '*'));
  }
  CUSTOM_GATEWAY_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customGatewayPort, null, null);
  menuItemContext.add(cm.URLContext(CUSTOM_GATEWAY_URI.spec + proto.ipfsScheme + '*'));
}

function enableHttpGatewayRedirect(button) {
  reloadCachedProperties();
  prefs.useCustomGateway = true;
  ipfsRequestObserver.register();
  require('sdk/simple-prefs').on('', reloadCachedProperties);
  if (button) button.state(button, gui.toggleStateEnabled);
}

function disableHttpGatewayRedirect(button) {
  if (prefs.useCustomGateway) ipfsRequestObserver.unregister();
  prefs.useCustomGateway = false;
  require('sdk/simple-prefs').removeListener('', reloadCachedProperties);
  if (button) button.state(button, gui.toggleStateDisabled);
}

exports.ipfsRequestObserver = ipfsRequestObserver;
exports.enableHttpGatewayRedirect = enableHttpGatewayRedirect;
exports.disableHttpGatewayRedirect = disableHttpGatewayRedirect;
exports.customUri = function() {
  return CUSTOM_GATEWAY_URI;
};
exports.publicUri = function() {
  return PUBLIC_GATEWAY_URI;
};
