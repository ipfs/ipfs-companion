var {
  Cc, Ci
} = require('chrome');
var {
  ToggleButton
} = require('sdk/ui/button/toggle');
var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var prefs = require('sdk/simple-prefs').prefs;
var cm = require('sdk/context-menu');
var clipboard = require('sdk/clipboard');
var l10n = require('sdk/l10n').get;
var protocols = require('./protocols.js');

const IPFS_SCHEME = protocols.ipfsScheme;
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
  protocols.ipfsHandler.prototype.factory.register();
  //console.log('Addon ' + addonTitle + ' loaded.');
};

exports.onUnload = function(reason) {
  protocols.ipfsHandler.prototype.factory.unregister();
  disableHttpGatewayRedirect();
  //console.log('Addon ' + addonTitle + ' unloaded: ' + reason);
};
