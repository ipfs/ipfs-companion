'use strict';

require('./gui.js');
require('./gateways.js');
var protocols = require('./protocols.js');

const parent = require('sdk/remote/parent');


exports.main = function(options, callbacks) { // jshint unused:false
  require('./redirects.js');
  protocols.register();
  //console.log('Addon loaded.');
  parent.remoteRequire("./lib/child-main.js");
};

exports.onUnload = function(reason) { // jshint unused:false
  protocols.unregister();
  //console.log('Addon unloaded: ' + reason);
};
