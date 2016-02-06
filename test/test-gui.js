const gui = require('../lib/gui.js')
const gw = require('../lib/gateways.js')

const button = gui.toggleButton
const buttonOn = gui.toggleButtonOn
const buttonOff = gui.toggleButtonOff
const panel = gui.toggleButtonPanel

// BUTTON BADGE
exports['test default toggleButton attributes'] = function (assert) {
  assert.equal(button.id, 'ipfs-gateway-status', 'button id')
  assert.equal(button.icon['16'], gw.redirectEnabled ? buttonOn.icon['16'] : buttonOff.icon['16'], 'default badge follows prefs.useCustomGateway')
}
exports['test disabled toggleButton'] = function (assert) {
  gw.redirectEnabled = false
  assert.equal(button.icon['16'], buttonOff.icon['16'], 'badge for prefs.useCustomGateway=false')
}
exports['test enabled toggleButton'] = function (assert) {
  gw.redirectEnabled = true
  assert.equal(button.icon['16'], buttonOn.icon['16'], 'badge for prefs.useCustomGateway=false')
}

// PANEL
exports['test toggleButtonPanel default state'] = function (assert) {
  assert.equal(panel.isShowing, false, 'panel should be hidden by default')
}
exports['test toggleButton & Panel onClick state'] = function (assert) {
  assert.equal(panel.isShowing, false, 'panel should be hidden by default')
/* TODO
button.click()
console.log('after click')
console.log(panel.isShowing)
assert.equal(panel.isShowing, true, 'panel should be displayed after toggleButton click event')
*/
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
