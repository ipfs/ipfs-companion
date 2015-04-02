var {
  Cc, Ci, Cu, Cm, components
} = require('chrome');
var {
  ToggleButton
} = require('sdk/ui/button/toggle');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var prefs = require('sdk/simple-prefs').prefs;
var cm = require('sdk/context-menu');
var clipboard = require('sdk/clipboard');
var l10n = require('sdk/l10n').get;

const IPFS_SCHEME = 'ipfs';
const PUBLIC_GATEWAY_URI = ioservice.newURI('http://gateway.ipfs.io', null, null);

var CUSTOM_GATEWAY_URI;

const enabledButton = {
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  badge: 'ON',
  badgeColor: '#4A9EA1'
};

const disabledButton = {
  icon: {
    '16': './icon-off-16.png',
    '32': './icon-off-32.png',
    '64': './icon-off-64.png'
  },
  badge: 'OFF',
  badgeColor: '#8C8C8C'
};

function copyPublicGatewayLink() {
  let ipfsURI = Cc['@mozilla.org/appshell/window-mediator;1']
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow('navigator:browser')
    .getBrowser().currentURI.spec;
  clipboard.set(ipfsURI.replace(CUSTOM_GATEWAY_URI.spec, PUBLIC_GATEWAY_URI.spec));
}

var menuItem = cm.Item({
  label: 'Copy IPFS link at ' + PUBLIC_GATEWAY_URI.host,
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: copyPublicGatewayLink
});

var ipfsRequestObserver = {
  observe: function(subject, topic, data) {
    if (topic == 'http-on-modify-request') {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);
      let httpUrl = channel.URI.spec;
      let ipfs = httpUrl.startsWith(PUBLIC_GATEWAY_URI.spec + IPFS_SCHEME);
      if (ipfs) {
        channel.setRequestHeader('x-ipfs-firefox-addon', 'true', false);
        if (prefs.useCustomGateway) {
          console.info('Detected HTTP request to the public gateway: ' + channel.URI.spec);
          let uri = ioservice.newURI(httpUrl.replace(PUBLIC_GATEWAY_URI.spec, CUSTOM_GATEWAY_URI.spec), null, null);
          console.info('Redirecting to custom gateway: ' + uri.spec);
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
      //console.info('IPFS Protocol Handler registered.');
    },
    unregister: function() {
      let m = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      m.unregisterFactory(IpfsProtocolHandler.prototype.classID, this);
      //console.info('IPFS Protocol Handler unregistered.');
    },
  }),

});

function reloadCachedProperties(changedProperty) {
  if (CUSTOM_GATEWAY_URI) {
    menuItem.context.remove(cm.URLContext(CUSTOM_GATEWAY_URI.spec + IPFS_SCHEME + '*'));
  }
  CUSTOM_GATEWAY_URI = ioservice.newURI('http://' + prefs.customGatewayHost + ':' + prefs.customGatewayPort, null, null);
  menuItem.context.add(cm.URLContext(CUSTOM_GATEWAY_URI.spec + IPFS_SCHEME + '*'));
}

function enableHttpGatewayRedirect(button) {
  reloadCachedProperties();
  prefs.useCustomGateway = true;
  ipfsRequestObserver.register();
  require('sdk/simple-prefs').on('', reloadCachedProperties);
  if (button) button.state(button, enabledButton);
}

function disableHttpGatewayRedirect(button) {
  prefs.useCustomGateway = false;
  ipfsRequestObserver.unregister();
  require('sdk/simple-prefs').removeListener('', reloadCachedProperties);
  if (button) button.state(button, disabledButton);
}

exports.main = function(options, callbacks) {


  var button = ToggleButton({
    id: 'ipfs-gateway-status',
    label: l10n('toggle_button_label'),
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
        enableHttpGatewayRedirect(button);
      } else {
        disableHttpGatewayRedirect(button);
      }
      //console.info('prefs.useCustomGateway: ' + prefs.useCustomGateway);
    }

  });


  enableHttpGatewayRedirect(button);
  IpfsProtocolHandler.prototype.factory.register();
  //console.log('Addon ' + addonTitle + ' loaded.');
};

exports.onUnload = function(reason) {
  IpfsProtocolHandler.prototype.factory.unregister();
  disableHttpGatewayRedirect();
  //console.log('Addon ' + addonTitle + ' unloaded: ' + reason);
};
