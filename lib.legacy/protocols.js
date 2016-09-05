'use strict'

const {Cc, Ci, Cu, Cm, Cr, components} = require('chrome')
const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)
Cu.import('resource://gre/modules/XPCOMUtils.jsm') /* global XPCOMUtils */
const gw = require('./gateways.js')
const isIPFS = require('./npm/is-ipfs.js')

const IPFS_SCHEME = 'ipfs'
const IPNS_SCHEME = 'ipns'
const FS_SCHEME = 'fs'
const WEB_SCHEME_PREFIX = 'web+' // https://github.com/lidel/ipfs-firefox-addon/issues/36

function CommonProtocolHandler () {}

function IpfsProtocolHandler () {}

function WebIpfsProtocolHandler () {}

function IpnsProtocolHandler () {}

function WebIpnsProtocolHandler () {}

function FsProtocolHandler () {}

function WebFsProtocolHandler () {}

const HANDLERS = {
  'fs': FsProtocolHandler,
  'ipfs': IpfsProtocolHandler,
  'ipns': IpnsProtocolHandler,

  'web+fs': WebFsProtocolHandler,
  'web+ipfs': WebIpfsProtocolHandler,
  'web+ipns': WebIpnsProtocolHandler
}

/*
 nsIURI does not not resolve relative paths properly
 nsIStandardURL does, but always uses /// for authority-less URLs
 thus we convert back and forth
*/
function resolveRelative (base, relative) {
  let newBase = Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIStandardURL)
  newBase.QueryInterface(Ci.nsIURI)
  newBase.init(Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, base.spec, null, null)
  let resolved = Cc['@mozilla.org/network/standard-url;1'].createInstance(Ci.nsIStandardURL)
  resolved.init(Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, relative, null, newBase)
  resolved.QueryInterface(Ci.nsIURI)

  // console.log("rel", base, relative, newBase, resolved)

  return resolved.spec
}

CommonProtocolHandler.prototype = Object.freeze({
  defaultPort: -1,
  allowPort: function (port, scheme) { // eslint-disable-line no-unused-vars
    return false
  },

  /*
   since ipfs is a public network and pages could just embed their own js-ipfs code anyway to fetch the data
   we allow any page to embed ipfs uris and waive CORS restrictions

   TODO: consider adding URI_SAFE_TO_LOAD_IN_SECURE_CONTEXT (discussion needed)
  */
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH |
    Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE |
    Ci.nsIProtocolHandler.URI_FETCHABLE_BY_ANYONE,

  normalizedIpfsPath: function (uriSpec) {
    let schemeExp = this.scheme.replace(/\+/, '\\+') // fix for web+fs etc
    let ipfsPath = uriSpec.replace(new RegExp('^' + schemeExp + '\\:\\/*'), '')
    // add protocol prefix if missing
    if (!(/^ip(?:f|n)s\//.test(ipfsPath))) {
      ipfsPath = this.pathPrefix + ipfsPath
    }
    return ipfsPath
  },

  newURI: function (aSpec, aOriginCharset, aBaseURI) {
    // console.info('Detected newURI with IPFS protocol: ' + aSpec)
    // console.log(aSpec, aOriginCharset, aBaseURI && aBaseURI.spec)

    if (aBaseURI && aBaseURI.scheme === this.scheme) {
      // presence of aBaseURI means a dependent resource or a relative link
      // resolve relative within the current protocol
      // leave the decision to convert to http to the next steps
      aSpec = resolveRelative(aBaseURI, aSpec)
    }

    let normalized = this.normalizedIpfsPath(aSpec)

    // console.log("norm", normalized)

    if (gw.fsUris && this.scheme === FS_SCHEME && new RegExp(`^${this.scheme}:`).test(aSpec)) {
      let uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI)
      uri.spec = this.scheme + ':/' + normalized
      return uri
    }

    let uri = ioservice.newURI(normalized, aOriginCharset, gw.publicUri)

    // console.info('newURI routed to HTTP gateway:  ' + uri.spec)
    return uri
  },

  newChannel2: function (aURI, loadInfo) {
    // console.info('Detected newChannel for IPFS protocol: ' + aURI.spec)
    let normalized = this.normalizedIpfsPath(this.pathPrefix + aURI.path)
    let httpUri = ioservice.newURI(normalized, aURI.originCharset, gw.gwUri)
    let channel = null

    if (loadInfo !== null) {
      channel = ioservice.newChannelFromURIWithLoadInfo(httpUri, loadInfo)
    } else {
      channel = ioservice.newChannelFromURI(httpUri)
    }

    // fs: handler should reject non-ipfs URIs
    if (!isIPFS.url(httpUri.spec)) {
      channel.cancel(Cr.NS_ERROR_MALFORMED_URI)
      return channel
    }

    if (gw.fsUris && this.scheme === FS_SCHEME) {
      channel.originalURI = aURI
      channel.loadFlags &= ~Ci.nsIChannel.LOAD_REPLACE

      // Cookies make no sense in the ipfs context
      // unless we have Suborigin header support.
      // Until https://git.io/vgAMj is resolved
      // we don't want to carry different gateway cookies into the page
      channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS

      if (isIPFS.ipfsPath(aURI.path)) {
        // no revalidation for /ipfs/ from cache, those are immutable
        channel.loadFlags |= Ci.nsIRequest.VALIDATE_NEVER
      }
    }

    // console.info('newChannel routed to HTTP gateway:  ' + channel.URI.spec)
    return channel
  },
  newChannel: function (aUri) {
    return this.newChannel2(aUri, null)
  }

})

// https://github.com/lidel/ipfs-firefox-addon/issues/36
function createWebVariant (target, base, uuid) {
  target.prototype = Object.create(base.prototype)
  target.prototype.constructor = target
  target.prototype.scheme = WEB_SCHEME_PREFIX + base.prototype.scheme
  target.prototype.classDescription = WEB_SCHEME_PREFIX + base.prototype.classDescription
  target.prototype.classID = components.ID(uuid)
  target.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + target.prototype.scheme
  target.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
}

IpfsProtocolHandler.prototype = Object.create(CommonProtocolHandler.prototype)
IpfsProtocolHandler.prototype.constructor = IpfsProtocolHandler
IpfsProtocolHandler.prototype.classDescription = 'ipfs Protocol Handler'
IpfsProtocolHandler.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + IPFS_SCHEME
IpfsProtocolHandler.prototype.classID = components.ID('{34023afe-f3aa-4b3d-b546-cb66f6e14c4b}')
IpfsProtocolHandler.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
IpfsProtocolHandler.prototype.scheme = IPFS_SCHEME
IpfsProtocolHandler.prototype.pathPrefix = IPFS_SCHEME + '/'
createWebVariant(WebIpfsProtocolHandler, IpfsProtocolHandler, '{713a4fe5-c5b8-43fa-a0c3-2742b3eea368}')

IpnsProtocolHandler.prototype = Object.create(CommonProtocolHandler.prototype)
IpnsProtocolHandler.prototype.constructor = IpnsProtocolHandler
IpnsProtocolHandler.prototype.classDescription = 'ipns Protocol Handler'
IpnsProtocolHandler.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + IPNS_SCHEME
IpnsProtocolHandler.prototype.classID = components.ID('{33920c2c-dd6b-11e4-b9d6-1681e6b88ec1}')
IpnsProtocolHandler.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
IpnsProtocolHandler.prototype.scheme = IPNS_SCHEME
IpnsProtocolHandler.prototype.pathPrefix = IPNS_SCHEME + '/'
createWebVariant(WebIpnsProtocolHandler, IpnsProtocolHandler, '{0f612fe4-5aa5-41ce-9fec-d827b702f5da}')

FsProtocolHandler.prototype = Object.create(CommonProtocolHandler.prototype)
FsProtocolHandler.prototype.constructor = FsProtocolHandler
FsProtocolHandler.prototype.classDescription = 'fs Protocol Handler'
FsProtocolHandler.prototype.contractID = '@mozilla.org/network/protocol;1?name=' + FS_SCHEME
FsProtocolHandler.prototype.classID = components.ID('{6684bdd9-41b5-4de3-ab3e-de3f3d888dcd}')
FsProtocolHandler.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIProtocolHandler])
FsProtocolHandler.prototype.scheme = FS_SCHEME
FsProtocolHandler.prototype.pathPrefix = ''
createWebVariant(WebFsProtocolHandler, FsProtocolHandler, '{82fbb59e-8349-442e-ad4e-ed3fa705c79d}')

function factory (ProtocolHandler) {
  return Object.freeze({
    createInstance: function (aOuter, aIID) { // eslint-disable-line no-unused-vars
      if (aOuter) {
        throw Cr.NS_ERROR_NO_AGGREGATION
      }
      return new ProtocolHandler()
    },
    register: function () {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar)
      let p = ProtocolHandler.prototype
      if (!m.isContractIDRegistered(p.contractID)) {
        m.registerFactory(p.classID, p.classDescription, p.contractID, this)
      }
    // console.info('Protocol Handler registered: ' + ProtocolHandler.prototype.scheme)
    },
    unregister: function () {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar)
      let p = ProtocolHandler.prototype
      if (m.isContractIDRegistered(p.contractID)) {
        m.unregisterFactory(p.classID, this)
      }
    // console.info('Protocol Handler unregistered: ' + ProtocolHandler.prototype.scheme)
    }
  })
}

// export handler factories (used in tests)
for (var scheme in HANDLERS) {
  exports[scheme] = factory(HANDLERS[scheme])
}

// register protocols
exports.register = function () {
  for (var scheme in HANDLERS) {
    (exports[scheme]).register()
  }
}

// unregister protocols
exports.unregister = function () {
  for (var scheme in HANDLERS) {
    (exports[scheme]).unregister()
  }
}

// used to canonize <a href="..."> and plain text links in pages
exports.rewrite = function (url) {
  const originalUrl = url
  // canonize ipfs schemes
  for (let k of Object.keys(HANDLERS)) {
    let c = HANDLERS[k]
    let p = c.prototype
    if (url.startsWith(p.scheme)) {
      return ioservice.newURI(url, null, null).spec
    }
  }

  // relative path
  if (isIPFS.ipfsPath(url)) {
    return ioservice.newURI(FS_SCHEME + ':' + url, null, null).spec
  }

  // TODO: reprocess gateways?

  // normal URL, don't touch
  return originalUrl
}

exports.ipfs = factory(IpfsProtocolHandler)
exports.ipns = factory(IpnsProtocolHandler)
exports.fs = factory(FsProtocolHandler)
