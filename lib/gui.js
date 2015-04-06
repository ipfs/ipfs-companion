var {
  Cc, Ci
} = require('chrome');
var cm = require('sdk/context-menu');
var clipboard = require('sdk/clipboard');
var l10n = require('sdk/l10n').get;
var prefs = require('sdk/simple-prefs').prefs;
var gw = require('./gateways.js');
var {
  ToggleButton
} = require('sdk/ui/button/toggle');

exports.toggleStateEnabled = {
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  badge: 'ON',
  badgeColor: '#4A9EA1'
};

exports.toggleStateDisabled = {
  icon: {
    '16': './icon-off-16.png',
    '32': './icon-off-32.png',
    '64': './icon-off-64.png'
  },
  badge: 'OFF',
  badgeColor: '#8C8C8C'
};

exports.toggleButton = ToggleButton({
  id: 'ipfs-gateway-status',
  label: l10n('toggle_button_label'),
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  checked: prefs.useCustomGateway,
  onChange: function(state) { // jshint unused:false
    // we want a global flag
    this.state('window', null);
    this.checked = !this.checked;

    // update GUI to reflect toggled state
    if (this.checked) {
      gw.enableHttpGatewayRedirect(this);
    } else {
      gw.disableHttpGatewayRedirect(this);
    }
    //console.info('prefs.useCustomGateway: ' + prefs.useCustomGateway);
  }

});


const MENU_ITEM = cm.Item({
  label: 'Copy link to IPFS Public Gateway',
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: function() {
    let ipfsURI = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow('navigator:browser')
      .getBrowser().currentURI.spec;
    clipboard.set(ipfsURI.replace(gw.customUri().spec, gw.publicUri().spec));
  }
});

exports.getMenuItemContext = function() {
  return MENU_ITEM.context;
};
