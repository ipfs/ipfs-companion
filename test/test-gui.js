var gui = require('./gui.js');
var gw = require('./gateways.js');
var prefs = require('sdk/simple-prefs').prefs;

exports['test toggleButton'] = function(assert) {
  var button = gui.toggleButton;
  assert.equal(button.id, 'ipfs-gateway-status', 'button id');
  assert.equal(button.checked, prefs.useCustomGateway, 'state equal prefs.useCustomGateway');

  gw.enableHttpGatewayRedirect(button);
  assert.equal(button.checked, prefs.useCustomGateway, 'state after gw.enableHttpGatewayRedirect()');

  gw.disableHttpGatewayRedirect(button);
  assert.equal(button.checked, prefs.useCustomGateway, 'state after gw.disableHttpGatewayRedirect()');
};

require('sdk/test').run(exports);
