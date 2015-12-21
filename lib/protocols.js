'use strict';

var {
  Cc, Ci, Cu, Cm, Cr, components
} = require('chrome');
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
Cu.import('resource://gre/modules/XPCOMUtils.jsm'); /* global XPCOMUtils */
var gw = require('./gateways.js');
const prefs = require("sdk/simple-prefs").prefs;

const IPFS_SCHEME = 'ipfs';
const IPNS_SCHEME = 'ipns';
const FS_SCHEME = 'fs';

const IPFS_PATH = new RegExp("^/ip(f|n)s/");

function CommonProtocolHandler() {}

function IpfsProtocolHandler() {}

function IpnsProtocolHandler() {}

function FsProtocolHandler() {}

var { Class } = require('sdk/core/heritage');
var { Unknown } = require('sdk/platform/xpcom');
var { Cc, Ci } = require('chrome')


CommonProtocolHandler.prototype = Object.freeze({

  defaultPort: -1,
  allowPort: function(port, scheme) { // jshint unused:false
    return false;
  },
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH |
    Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    //console.info('Detected newURI with IPFS protocol: ' + aSpec);

    // standardURL handles relative path resolution for us
    // but it converts :/ into :/// so we need to convert back to simple URI to fix that

    //console.log(aSpec, aOriginCharset, aBaseURI, this.scheme);

    var sURL = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIStandardURL);

    if (aBaseURI) {
      if(aBaseURI.scheme != this.scheme) {
        aBaseURI = null; // throw new Error(this.scheme+" handler can't resolve relative to "+aSpec);
      } else {
        let newBase = Cc["@mozilla.org/network/standard-url;1"].createInstance(Ci.nsIStandardURL);
        newBase.init(Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, aBaseURI.spec, null, null);
        aBaseURI = newBase;
      }
    }

    sURL.init(Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, aSpec, aOriginCharset, aBaseURI);
    sURL.QueryInterface(Ci.nsIURI);

    //console.log("sURL spec", sURL.spec)

    let uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);
    let canonizedSpec = this.canonize(sURL.spec);

    //console.log("canonized",canonizedSpec);

    uri.spec = this.canonize(canonizedSpec);

    let rewrite = prefs.rewriteAs;

    if(this.isRewriteTarget) {
      return uri;
    }

    switch(prefs.rewriteAs) {
      case "fs":
        return ioservice.newURI(uri.spec.replace(new RegExp("^" + this.scheme), FS_SCHEME), null, null);
      case "gateway":
      default:
        return this.toHttpUri(uri.spec);
    }

    throw new Error("should not reach here");
  },

  get isRewriteTarget() {
    let rewrite = prefs.rewriteAs;
    return rewrite == this.scheme;

  },

  // ipfs:/ipfs/Qm...  -> ipfs:/ipfs/Qm...
  // ipfs:///Qm...     -> ipfs:/ipfs/Qm...
  // ipfs:Qm...        -> ipfs:/ipfs/Qm...
  // fs:/ipfs/Qm...    -> fs:/ipfs/Qm...
  canonize(unsanitizedSpec) {
    return unsanitizedSpec.replace(new RegExp('^' + this.scheme + '\\:/*('+ this.pathPrefix +')?'), this.scheme + ":/" + this.pathPrefix);
  },

  toHttpUri(canonizedSpec) {
    let relativeIpfsReference = canonizedSpec.replace(new RegExp('^' + this.scheme + ':/'), '');
    let httpspec = gw.publicUri().resolve(relativeIpfsReference);
    return ioservice.newURI(httpspec, null, null);
  },

  newChannel: function(aURI) {

    let rewritten = aURI;

    if(!this.isRewriteTarget) {
      rewritten = this.newURI(aURI.spec, null, null);
    }

    let httpUri = rewritten;

    httpUri.QueryInterface(Ci.nsIURI);


    if(!/^http[s]?/.test(httpUri.scheme)) {
        httpUri = this.toHttpUri(this.canonize(aURI.spec));
    }


    //console.info('Detected newChannel for IPFS protocol: ' + aURI.spec);
    let channel = ioservice.newChannelFromURI(httpUri);

    channel.QueryInterface(Ci.nsIChannel)

    //console.log(httpUri.spec, rewritten.spec, channel)

    channel.loadFlags |= Ci.nsIChannel.LOAD_ANONYMOUS; // | Ci.nsIChannel.LOAD_REPLACE

    channel.originalURI = rewritten;

    //console.log("created chan", channel.originalURI.spec, channel.URI.spec)

    //console.info('newChannel routed to HTTP gateway:  ' + channel.URI.spec);
    return channel;
  }
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
      if (!m.isContractIDRegistered(p.contractID)) {
        m.registerFactory(p.classID, p.classDescription, p.contractID, this);
      }
      //console.info('Protocol Handler registered: ' + ProtocolHandler.prototype.scheme);
    },
    unregister: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      let p = ProtocolHandler.prototype;
      if (m.isContractIDRegistered(p.contractID)) {
        m.unregisterFactory(p.classID, this);
      }
      //console.info('Protocol Handler unregistered: ' + ProtocolHandler.prototype.scheme);
    },
  });
}

const handlerClasses = [IpfsProtocolHandler, IpnsProtocolHandler, FsProtocolHandler]

exports.ipfsScheme = IPFS_SCHEME;
exports.ipnsScheme = IPNS_SCHEME;
exports.fsScheme = FS_SCHEME;

exports.ipfsHandler = Object.freeze(IpfsProtocolHandler);
exports.ipnsHandler = Object.freeze(IpnsProtocolHandler);
exports.fsHandler = Object.freeze(FsProtocolHandler);

// used to canonize <a href="..."> and plain text links in pages
exports.rewrite = function(url) {
  // canonize ipfs schemes
  for(let c of handlerClasses) {
    let p = c.prototype;
    if(url.startsWith(p.scheme)) {
      return ioservice.newURI(url, null, null).spec;
    }

  }

  // relative path
  if(IPFS_PATH.test(url)) {
    return ioservice.newURI(FS_SCHEME + ":" + url, null, null).spec
  }

  // TODO: reprocess gateways?

  // normal URL, don't touch
  return null;
}

exports.ipfs = factory(IpfsProtocolHandler);
exports.ipns = factory(IpnsProtocolHandler);
exports.fs = factory(FsProtocolHandler);
