'use strict';

require('./gui.js');
require('./gateways.js');
var proto = require('./protocols.js');

const parent = require('sdk/remote/parent');


exports.main = function(options, callbacks) { // jshint unused:false
  require('./redirects.js');
  proto.fs.register();
  proto.ipfs.register();
  proto.ipns.register();
  //console.log('Addon loaded.');
  parent.remoteRequire("./lib/child-main.js");
};

exports.onUnload = function(reason) { // jshint unused:false
  proto.fs.unregister();
  proto.ipfs.unregister();
  proto.ipns.unregister();
  //console.log('Addon unloaded: ' + reason);
};
