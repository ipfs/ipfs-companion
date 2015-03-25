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
const PUBLIC_GATEWAY_URI = ioservice.newURI('http://gateway.ipfs.io/ipfs/', null, null);

function httpGatewayRoot() {
  if (prefs.useCustomGatewayRoot) {
    return prefs.customGatewayRoot;
  } else {
    return PUBLIC_GATEWAY_URI.spec;
  }
}


function httpGatewayListener(event) {
  let channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
  let requestToPublicGateway = channel.URI.spec.startsWith(PUBLIC_GATEWAY_URI.spec);
  if (requestToPublicGateway && prefs.useCustomGatewayRoot) {
    console.info('Detected request to public HTTP gateway: ' + channel.URI.spec);
    let uri = ioservice.newURI(channel.URI.spec.replace(PUBLIC_GATEWAY_URI.spec, prefs.customGatewayRoot), null, null);
    console.info('Redirecting to custom HTTP gateway: ' + uri.spec);
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
    Ci.nsIProtocolHandler.ALLOWS_PROXY_HTTP |
    Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    // presence of aBaseURI means a dependent resource or a relative link
    // and we need to return correct http URI
    if (aBaseURI && aBaseURI.scheme == IPFS_SCHEME) {
      //console.log('newURI/aSpec: ' + aSpec);
      //console.log('newURI/aBaseURI.spec: ' + aBaseURI.spec);
      let httpBaseURI = ioservice.newURI(PUBLIC_GATEWAY_URI.spec + aBaseURI.path, null, null);
      //console.log('newURI/httpBaseURI.spec: ' + httpBaseURI.spec);
      let newURI = ioservice.newURI(aSpec, aOriginCharset, httpBaseURI);
      //console.log('newURI/newURI.spec: ' + newURI.spec);
      return newURI;
    }
    let uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    //uri.spec = (aBaseURI === null) ? aSpec : PUBLIC_GATEWAY_URI.resolve(aSpec);
    return uri;
  },

  newChannel: function(aURI) {
    console.info('Detected request using IPFS protocol hadler: ' + aURI.spec);
    let genericHttpLocation = PUBLIC_GATEWAY_URI.spec + aURI.path;
    let channel = ioservice.newChannel(genericHttpLocation, aURI.originCharset, null);
    console.info('Request routed to HTTP gateway:  ' + genericHttpLocation);

    // line below would keep nice protocol URL in GUI
    // but is disabled for now due to issues like
    // https://github.com/lidel/ipfs-firefox-addon/issues/3
    //channel.originalURI = aURI;

    return channel;
  },

  factory: Object.freeze({
    createInstance: function(aOuter, aIID) {
      if (aOuter) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
      }
      //return (new IpfsProtocolHandler()).QueryInterface(aIID);
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

function enableHttpGatewayRedirect() {
  prefs.useCustomGatewayRoot = true;
  events.on('http-on-modify-request', httpGatewayListener);
}

function disableHttpGatewayRedirect() {
  prefs.useCustomGatewayRoot = false;
  events.off('http-on-modify-request', httpGatewayListener);
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
    checked: prefs.useCustomGatewayRoot,
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
      console.info('ipfs.prefs.useCustomGatewayRoot: ' + prefs.useCustomGatewayRoot);
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
  disableHttpGatewayRedirect();
  IpfsProtocolHandler.prototype.factory.unregister();
  console.log('Addon ' + addonTitle + ' unloaded: ' + reason);
};


// TODO: when we have more functionality, we should add tests:
// a dummy function, to show how tests work.
// to see how to test this function, look at ../test/test-main.js
function dummy(text, callback) {
  callback(text);
}
exports.dummy = dummy;
