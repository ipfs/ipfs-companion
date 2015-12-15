var gui = require('../lib/gui.js');
var gw = require('../lib/gateways.js');
var prefs = require('sdk/simple-prefs').prefs;
const button = gui.toggleButton;

exports['test toggleButton attributes'] = function(assert) {
  assert.equal(button.id, 'ipfs-gateway-status', 'button id');
  assert.equal(button.checked, prefs.useCustomGateway, 'default state equal prefs.useCustomGateway');
};

exports['test disabled toggleButton'] = function(assert) {
  gw.toggle(false);
  assert.equal(button.checked, prefs.useCustomGateway, 'state after gw.disableHttpGatewayRedirect()');
};

exports['test enabled toggleButton'] = function(assert) {
  gw.toggle(true);
  assert.equal(button.checked, prefs.useCustomGateway, 'state after gw.enableHttpGatewayRedirect()');
};

require('sdk/test').run(exports);
