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
  let uri = channel.URI.spec;
  let requestToPublicGateway = uri.startsWith(PUBLIC_GATEWAY_URI.spec);
  let requestToCustomGateway = !requestToPublicGateway && uri.startsWith(prefs.customGatewayRoot);
  if (requestToPublicGateway || requestToCustomGateway) {
    console.info('Detected request to IPFS HTTP Gateway: ' + channel.URI.spec);
    let gatewayRoot = requestToPublicGateway ? PUBLIC_GATEWAY_URI.spec : prefs.customGatewayRoot;
    let customURI = ioservice.newURI(uri.replace(gatewayRoot, IPFS_SCHEME + ':'), null, null);
    if (requestToPublicGateway) {
      // redirect request to custom gateway
      console.info('Redirecting to: ' + customURI.spec);
      channel.redirectTo(customURI);
    } else {
      //console.info('Redirecting to: ' + customURI.spec);
      //channel.redirectTo(customURI);
      //console.info('Swapping URL in GUI to: ' + customURI.spec);
      // already using custom gateway, just set protocol in GUI
      // channel.originalURI = customURI;
    }

    // TODO: move to own function
    // some free metrics
    //channel.setRequestHeader('x-ipfs-firefox-addon-version', version, false);
    //channel.setRequestHeader('x-ipfs-firefox-addon-state', button.checked, false);
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

  protocolFlags: Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  newURI: function(aSpec, aOriginCharset, aBaseURI) {
    // presence of aBaseURI means a dependent resource or a relative link
    // and we need to return http URI
    if (aBaseURI && aBaseURI.scheme == IPFS_SCHEME) {
      let httpBaseURI = ioservice.newURI(httpGatewayRoot()+aBaseURI.path, null, null);
      console.info('IPFS.newURI/httpBaseURI:  ' + aBaseURI.spec);
      return ioservice.newURI(aSpec, aOriginCharset, httpBaseURI);
    }

    let uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);

    uri.spec = aSpec;

    return uri;
  },

  newChannel: function(aURI) {
    let spec = httpGatewayRoot() + aURI.path;
    let channel = ioservice.newChannel(spec, aURI.originCharset, null);
    console.info('IPFS.newChannel/input.spec:  ' + aURI.spec);
    console.info('IPFS.newChannel/return.spec:  ' + spec);

    // keep nice protocol URL in GUI :-)
    channel.originalURI = aURI;

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

function enableIpfsSupport() {
  IpfsProtocolHandler.prototype.factory.register();
  events.on('http-on-modify-request', httpGatewayListener);
}

function disableIpfsSupport() {
  IpfsProtocolHandler.prototype.factory.unregister();
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
        enableIpfsSupport();
        prefs.useCustomGatewayRoot = true;
        button.state(button, enabledState);
      } else {
        disableIpfsSupport();
        prefs.useCustomGatewayRoot = false;
        button.state(button, disabledState);
      }
      console.info('Use custom IPFS Gateway: ' + prefs.useCustomGatewayRoot);
    }

  });
  if (button.checked) {
    button.state(button, enabledState);
  } else {
    button.state(button, disabledState);
  }

  enableIpfsSupport();
  console.log('Addon ' + addonTitle + ' loaded.');
};

exports.onUnload = function(reason) {
  disableIpfsSupport();
  console.log('Addon ' + addonTitle + ' unloaded: ' + reason);
};


// TODO: when we have more functionality, we should add tests:
// a dummy function, to show how tests work.
// to see how to test this function, look at ../test/test-main.js
function dummy(text, callback) {
  callback(text);
}
exports.dummy = dummy;
