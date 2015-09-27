'use strict';

var gui = require('./gui.js');
var gw = require('./gateways.js');
var proto = require('./protocols.js');


exports.main = function(options, callbacks) { // jshint unused:false
  gw.enableHttpGatewayRedirect(gui.toggleButton);
  proto.fs.register();
  proto.ipfs.register();
  proto.ipns.register();
  //console.log('Addon loaded.');
};

exports.onUnload = function(reason) { // jshint unused:false
  gw.disableHttpGatewayRedirect();
  proto.fs.unregister();
  proto.ipfs.unregister();
  proto.ipns.unregister();
  //console.log('Addon unloaded: ' + reason);
};
