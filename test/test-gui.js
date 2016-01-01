
var gui = require('../lib/gui.js');
var gw = require('../lib/gateways.js');
var prefs = require('sdk/simple-prefs').prefs;

var button = gui.toggleButton;
var panel = gui.toggleButtonPanel;

// BUTTON BADGE
exports['test default toggleButton attributes'] = function(assert) {
  assert.equal(button.id, 'ipfs-gateway-status', 'button id');
  assert.equal(button.badge, prefs.useCustomGateway ? 'ON' : 'OFF', 'default badge follows prefs.useCustomGateway');
};
exports['test disabled toggleButton'] = function(assert) {
  gw.toggle(false);
  assert.equal(button.badge, 'OFF', 'badge for prefs.useCustomGateway=false');
};
exports['test enabled toggleButton'] = function(assert) {
  gw.toggle(true);
  assert.equal(button.badge, 'ON', 'badge for prefs.useCustomGateway=false');
};

exports['test toggleButtonPanel default state'] = function(assert) {
  assert.equal(panel.isShowing, false, 'panel should be hidden by default');
};

/* TODO: test onclick state
exports['test toggleButton & Panel onClick state'] = function(assert, done) {
  let { waitUntil } = require('sdk/test/utils');

  assert.equal(panel.isShowing, false, 'panel should be hidden by default');

  button.click();

  console.log('before waitUntil');
  waitUntil(function() {
    console.log('run waitUntil');
    return panel.isShowing;
  }, 100).then(function() {
    console.log('run waitUntil.then');
    assert.equal(panel.isShowing, true, 'panel should be displayed after toggleButton click event');
    done();
  });
  console.log('after waitUntil');

};
*/

require('sdk/test').run(exports);
