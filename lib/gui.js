'use strict';

var {
  Cc, Ci
} = require('chrome');
var cm = require('sdk/context-menu');
var clipboard = require('sdk/clipboard');
var l10n = require('sdk/l10n').get;
var gw = require('./gateways.js');

var {
  ToggleButton
} = require('sdk/ui/button/toggle');

const ON_STATE = {
  checked: true,
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  badge: 'ON',
  badgeColor: '#4A9EA1'
};

const OFF_STATE = {
  checked: false,
  icon: {
    '16': './icon-off-16.png',
    '32': './icon-off-32.png',
    '64': './icon-off-64.png'
  },
  badge: 'OFF',
  badgeColor: '#8C8C8C'
};

let supressRecursion = false;

const button = new ToggleButton({
  id: 'ipfs-gateway-status',
  label: l10n('toggle_button_label'),
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  checked: gw.isEnabled(),
  onChange: function(state) { // jshint unused:false
    if (supressRecursion)
      return;
    supressRecursion = true;
    toggle(state.checked);
    supressRecursion = false;
  }

});

exports.toggleButton = button;


function toggle(val) { /*jshint ignore:line*/
  let newState = val ? ON_STATE : OFF_STATE;

  Object.keys(newState).forEach((k) => {
    button[k] = newState[k];
  });

  gw.toggle(val);
}



const COPY_IPFS_ADDRESS = cm.Item({
  label: 'Copy canonical address',
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: function() {
    let ipfsURI = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow('navigator:browser')
      .getBrowser().currentURI.spec;
    clipboard.set(ipfsURI.replace(gw.customUri().spec, '/'));
  }
});

const COPY_PUBLIC_HTTP_URL = cm.Item({
  label: 'Copy Public Gateway URL',
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: function() {
    let ipfsURI = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow('navigator:browser')
      .getBrowser().currentURI.spec;
    clipboard.set(ipfsURI.replace(gw.customUri().spec, gw.publicUri().spec));
  }
});

cm.Menu({
  label: 'IPFS',
  items: [COPY_IPFS_ADDRESS, COPY_PUBLIC_HTTP_URL]
});


gw.onChange(() => {
  for (let ctx of[COPY_PUBLIC_HTTP_URL.context, COPY_IPFS_ADDRESS.context]) {
    let url = gw.customUri().spec + '*';
    ctx.add(cm.URLContext(url));
  }
  toggle(gw.isEnabled());
});

toggle(gw.isEnabled());
