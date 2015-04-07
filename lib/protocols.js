'use strict';

var {
  Cc, Ci, Cu, Cm, Cr, components
} = require('chrome');
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
Cu.import('resource://gre/modules/XPCOMUtils.jsm');/* global XPCOMUtils */
var gw = require('./gateways.js');

const IPFS_SCHEME = 'ipfs';

function IpfsProtocolHandler() {}
IpfsProtocolHandler.prototype = Object.freeze({
  classDescription: 'IPFS Basic Protocol Handler',
  contractID: '@mozilla.org/network/protocol;1?name=' + IPFS_SCHEME,
  classID: components.ID('{34023afe-f3aa-4b3d-b546-cb66f6e14c4b}'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: IPFS_SCHEME,
  defaultPort: -1,
  allowPort: function(port, scheme) { // jshint unused:false
    return false;
  },

  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH |
    Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    //console.info('Detected newURI with IPFS protocol: ' + aSpec);

    if (aBaseURI && aBaseURI.scheme == this.scheme) {
      // presence of aBaseURI means a dependent resource or a relative link
      // and we need to return correct http URI
      let http = gw.publicUri().spec + this.scheme + '/' + aBaseURI.path;
      let base = ioservice.newURI(http, null, null);
      let uri = ioservice.newURI(aSpec, aOriginCharset, base);
      return uri;
    }

    /* Left for future use (if we enable channel.originalURI in newChannel method)
    let uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    return uri;
    */

    let ipfsPath = aSpec.replace(/^ipfs:/, '');
    let http = gw.publicUri().spec + this.scheme + '/' + ipfsPath;
    let uri = ioservice.newURI(http, aOriginCharset, null);

    //console.info('newURI routed to HTTP gateway:  ' + uri.spec);
    return uri;
  },

  newChannel: function(aURI) {
    //console.info('Detected newChannel for IPFS protocol: ' + aURI.spec);
    let http = gw.publicUri().spec + '/' + this.scheme + '/' + aURI.path;
    let channel = ioservice.newChannel(http, aURI.originCharset, null);

    // line below would keep nice protocol URL in GUI
    // but is disabled for now due to issues like
    // https://github.com/lidel/ipfs-firefox-addon/issues/3
    //channel.originalURI = aURI;

    //console.info('newChannel routed to HTTP gateway:  ' + channel.URI.spec);
    return channel;
  },

  factory: Object.freeze({
    createInstance: function(aOuter, aIID) { // jshint unused:false
      if (aOuter) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      return new IpfsProtocolHandler();
    },
    register: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      let p = IpfsProtocolHandler.prototype;
      m.registerFactory(p.classID, p.classDescription, p.contractID, this);
      //console.info('IPFS Protocol Handler registered.');
    },
    unregister: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      m.unregisterFactory(IpfsProtocolHandler.prototype.classID, this);
      //console.info('IPFS Protocol Handler unregistered.');
    },
  }),
});

exports.ipfsScheme = IPFS_SCHEME;
exports.ipfsHandler = IpfsProtocolHandler;
