'use strict';

var {
  Cc, Ci, Cu, Cm, Cr, components
} = require('chrome');
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
Cu.import('resource://gre/modules/XPCOMUtils.jsm'); /* global XPCOMUtils */
var gw = require('./gateways.js');

const IPFS_SCHEME = 'ipfs';
const IPNS_SCHEME = 'ipns';
const FS_SCHEME = 'fs';

function CommonProtocolHandler() {}

function IpfsProtocolHandler() {}

function IpnsProtocolHandler() {}

function FsProtocolHandler() {}

CommonProtocolHandler.prototype = Object.freeze({

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
      let http = gw.publicUri().spec + this.pathPrefix + aBaseURI.path;
      let base = ioservice.newURI(http, null, null);
      let uri = ioservice.newURI(aSpec, aOriginCharset, base);
      return uri;
    }

    /* Left for future use (if we enable channel.originalURI in newChannel method)
    let uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    return uri;
    */

    let ipfsPath = aSpec.replace(new RegExp('^' + this.scheme + '\\:\\/*'), '');
    let http = gw.publicUri().spec + this.pathPrefix + ipfsPath;
    let uri = ioservice.newURI(http, aOriginCharset, null);

    //console.info('newURI routed to HTTP gateway:  ' + uri.spec);
    return uri;
  },

  newChannel: function(aURI) {
    //console.info('Detected newChannel for IPFS protocol: ' + aURI.spec);
    let http = gw.publicUri().spec + this.pathPrefix + aURI.path;
    let channel = ioservice.newChannel(http, aURI.originCharset, null);

    // line below would keep nice protocol URL in GUI
    // but is disabled for now due to issues like
    // https://github.com/lidel/ipfs-firefox-addon/issues/3
    //channel.originalURI = aURI;

    //console.info('newChannel routed to HTTP gateway:  ' + channel.URI.spec);
    return channel;
  },

});

IpfsProtocolHandler.prototype = Object.create(CommonProtocolHandler.prototype);
IpfsProtocolHandler.prototype.constructor = IpfsProtocolHandler;
IpfsProtocolHandler.prototype.classDescription = 'IPFS Protocol Handler';
IpfsProtocolHandler.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + IPFS_SCHEME;
IpfsProtocolHandler.prototype.classID = components.ID('{34023afe-f3aa-4b3d-b546-cb66f6e14c4b}');
IpfsProtocolHandler.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler]);
IpfsProtocolHandler.prototype.scheme = IPFS_SCHEME;
IpfsProtocolHandler.prototype.pathPrefix = IPFS_SCHEME + '/';

IpnsProtocolHandler.prototype = Object.create(CommonProtocolHandler.prototype);
IpnsProtocolHandler.prototype.constructor = IpnsProtocolHandler;
IpnsProtocolHandler.prototype.classDescription = 'IPNS Protocol Handler';
IpnsProtocolHandler.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + IPNS_SCHEME;
IpnsProtocolHandler.prototype.classID = components.ID('{33920c2c-dd6b-11e4-b9d6-1681e6b88ec1}');
IpnsProtocolHandler.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler]);
IpnsProtocolHandler.prototype.scheme = IPNS_SCHEME;
IpnsProtocolHandler.prototype.pathPrefix = IPNS_SCHEME + '/';

FsProtocolHandler.prototype = Object.create(CommonProtocolHandler.prototype);
FsProtocolHandler.prototype.constructor = FsProtocolHandler;
FsProtocolHandler.prototype.classDescription = 'FS Protocol Handler';
FsProtocolHandler.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + FS_SCHEME;
FsProtocolHandler.prototype.classID = components.ID('{6684bdd9-41b5-4de3-ab3e-de3f3d888dcd}');
FsProtocolHandler.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler]);
FsProtocolHandler.prototype.scheme = FS_SCHEME;
FsProtocolHandler.prototype.pathPrefix = '';

function factory(ProtocolHandler) {
  return Object.freeze({
    createInstance: function(aOuter, aIID) { // jshint unused:false
      if (aOuter) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      return new ProtocolHandler();
    },
    register: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      let p = ProtocolHandler.prototype;
      m.registerFactory(p.classID, p.classDescription, p.contractID, this);
      //console.info('Protocol Handler registered: ' + ProtocolHandler.prototype.scheme);
    },
    unregister: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      m.unregisterFactory(ProtocolHandler.prototype.classID, this);
      //console.info('Protocol Handler unregistered: ' + ProtocolHandler.prototype.scheme);
    },
  });
}

exports.ipfsScheme = IPFS_SCHEME;
exports.ipnsScheme = IPNS_SCHEME;
exports.fsScheme = FS_SCHEME;

exports.ipfsHandler = Object.freeze(IpfsProtocolHandler);
exports.ipnsHandler = Object.freeze(IpnsProtocolHandler);
exports.fsHandler = Object.freeze(FsProtocolHandler);

exports.ipfs = factory(IpfsProtocolHandler);
exports.ipns = factory(IpnsProtocolHandler);
exports.fs = factory(FsProtocolHandler);
