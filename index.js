var {
  Cc, Ci, Cu, Cm, components
} = require('chrome');
var {
  ToggleButton
} = require('sdk/ui/button/toggle');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var events = require('sdk/system/events');
var prefs = require('sdk/simple-prefs').prefs;

const version = require('./package.json').version;
const addonTitle = require('./package.json').title;

const IPFS_SCHEME = 'ipfs';
const PUBLIC_GATEWAY_URI = ioservice.newURI('http://gateway.ipfs.io', null, null);

var CUSTOM_GATEWAY_URI;


function httpGatewayListener(event) {
  let channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
  let httpUrl = channel.URI.spec;
  let ipfs = httpUrl.startsWith(PUBLIC_GATEWAY_URI.spec + IPFS_SCHEME);
  if (ipfs && prefs.useCustomGateway) {
    console.info('Detected HTTP request to the public gateway: ' + channel.URI.spec);
    let uri = ioservice.newURI(httpUrl.replace(PUBLIC_GATEWAY_URI.spec, CUSTOM_GATEWAY_URI.spec), null, null);
    console.info('Redirecting to custom gateway: ' + uri.spec);
    channel.setRequestHeader('x-ipfs-firefox-addon-version', version, false);
    channel.redirectTo(uri);
  }
}

function IpfsProtocolHandler() {}
IpfsProtocolHandler.prototype = Object.freeze({
  classDescription: 'IPFS Basic Protocol Handler',
  contractID: '@mozilla.org/network/protocol;1?name=' + IPFS_SCHEME,
  classID: components.ID('{34023afe-f3aa-4b3d-b546-cb66f6e14c4b}'),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: IPFS_SCHEME,
  defaultPort: -1,
  allowPort: function(port, scheme) {
    return false;
  },

  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH |
    Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    //console.info('Detected newURI with IPFS protocol: ' + aSpec);

    if (aBaseURI && aBaseURI.scheme == this.scheme) {
      // presence of aBaseURI means a dependent resource or a relative link
      // and we need to return correct http URI
      let http = PUBLIC_GATEWAY_URI.spec + '/' + this.scheme + '/' + aBaseURI.path;
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
    let http = PUBLIC_GATEWAY_URI.spec + '/' + this.scheme + '/' + ipfsPath;
    let uri = ioservice.newURI(http, aOriginCharset, null);

    //console.info('newURI routed to HTTP gateway:  ' + uri.spec);
    return uri;
  },

  newChannel: function(aURI) {
    //console.info('Detected newChannel for IPFS protocol: ' + aURI.spec);
    let http = PUBLIC_GATEWAY_URI.spec + '/' + this.scheme + '/' + aURI.path;
    let channel = ioservice.newChannel(http, aURI.originCharset, null);

    // line below would keep nice protocol URL in GUI
    // but is disabled for now due to issues like
    // https://github.com/lidel/ipfs-firefox-addon/issues/3
    //channel.originalURI = aURI;

    //console.info('newChannel routed to HTTP gateway:  ' + channel.URI.spec);
    return channel;
  },

  factory: Object.freeze({
    createInstance: function(aOuter, aIID) {
      if (aOuter) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      return new IpfsProtocolHandler();
    },
    register: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      let p = IpfsProtocolHandler.prototype;
      m.registerFactory(p.classID, p.classDescription, p.contractID, this);
      console.info('IPFS Protocol Handler registered.');
    },
    unregister: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      m.unregisterFactory(IpfsProtocolHandler.prototype.classID, this);
      console.info('IPFS Protocol Handler unregistered.');
    },
  }),

});

function reloadCachedProperties(changedProperty) {
  CUSTOM_GATEWAY_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customGatewayPort, null, null);
}

function enableHttpGatewayRedirect() {
  reloadCachedProperties();
  prefs.useCustomGateway = true;
  events.on('http-on-modify-request', httpGatewayListener);
  require('sdk/simple-prefs').on('', reloadCachedProperties);
}

function disableHttpGatewayRedirect() {
  prefs.useCustomGateway = false;
  events.off('http-on-modify-request', httpGatewayListener);
  require('sdk/simple-prefs').removeListener('', reloadCachedProperties);
}

exports.main = function(options, callbacks) {

  const enabledState = {
    icon: {
      '16': './icon-on-16.png',
      '32': './icon-on-32.png',
      '64': './icon-on-64.png'
    },
    badge: 'ON',
    badgeColor: '#4A9EA1'
  };

  const disabledState = {
    icon: {
      '16': './icon-off-16.png',
      '32': './icon-off-32.png',
      '64': './icon-off-64.png'
    },
    badge: 'OFF',
    badgeColor: '#8C8C8C'
  };

  var button = ToggleButton({
    id: 'ipfs-gateway-status',
    label: 'IPFS Gateway Redirect',
    icon: {
      '16': './icon-on-16.png',
      '32': './icon-on-32.png',
      '64': './icon-on-64.png'
    },
    checked: prefs.useCustomGateway,
    onChange: function(state) {
      // we want a global flag
      this.state('window', null);
      this.checked = !this.checked;

      // update GUI to reflect toggled state
      if (this.checked) {
        enableHttpGatewayRedirect();
        button.state(button, enabledState);
      } else {
        disableHttpGatewayRedirect();
        button.state(button, disabledState);
      }
      console.info('ipfs.prefs.useCustomGateway: ' + prefs.useCustomGateway);
    }

  });
  if (button.checked) {
    button.state(button, enabledState);
  } else {
    button.state(button, disabledState);
  }

  enableHttpGatewayRedirect();
  IpfsProtocolHandler.prototype.factory.register();
  console.log('Addon ' + addonTitle + ' loaded.');
};

exports.onUnload = function(reason) {
  IpfsProtocolHandler.prototype.factory.unregister();
  disableHttpGatewayRedirect();
  console.log('Addon ' + addonTitle + ' unloaded: ' + reason);
};


// TODO: when we have more functionality, we should add tests:
// a dummy function, to show how tests work.
// to see how to test this function, look at ../test/test-main.js
function dummy(text, callback) {
  callback(text);
}
exports.dummy = dummy;
