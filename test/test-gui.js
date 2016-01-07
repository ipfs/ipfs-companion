var gui = require('../lib/gui.js');
var gw = require('../lib/gateways.js');

var button = gui.toggleButton;
var panel = gui.toggleButtonPanel;

// BUTTON BADGE
exports['test default toggleButton attributes'] = function(assert) {
  assert.equal(button.id, 'ipfs-gateway-status', 'button id');
  assert.equal(button.badge, gw.redirectEnabled ? 'ON' : 'OFF', 'default badge follows prefs.useCustomGateway');
};
exports['test disabled toggleButton'] = function(assert) {
  gw.redirectEnabled = false;
  assert.equal(button.badge, 'OFF', 'badge for prefs.useCustomGateway=false');
};
exports['test enabled toggleButton'] = function(assert) {
  gw.redirectEnabled = true;
  assert.equal(button.badge, 'ON', 'badge for prefs.useCustomGateway=false');
};

// PANEL
exports['test toggleButtonPanel default state'] = function(assert) {
  assert.equal(panel.isShowing, false, 'panel should be hidden by default');
};
exports['test toggleButton & Panel onClick state'] = function(assert) {
  assert.equal(panel.isShowing, false, 'panel should be hidden by default');
  /* TODO
  button.click();
  console.log('after click');
  console.log(panel.isShowing);
  assert.equal(panel.isShowing, true, 'panel should be displayed after toggleButton click event');
  */
};

require('sdk/test').run(exports);
