var gui = require('./gui.js');
var gw = require('./gateways.js');
var proto = require('./protocols.js');

exports.main = function(options, callbacks) { // jshint unused:false
  gw.enableHttpGatewayRedirect(gui.toggleButton);
  proto.ipfsHandler.prototype.factory.register();
  //console.log('Addon loaded.');
};

exports.onUnload = function(reason) { // jshint unused:false
  gw.disableHttpGatewayRedirect();
  proto.ipfsHandler.prototype.factory.unregister();
  //console.log('Addon unloaded: ' + reason);
};
