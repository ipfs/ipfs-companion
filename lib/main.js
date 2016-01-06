'use strict';

require('./gui.js');
require('./gateways.js');
const protocols = require('./protocols.js');

const parent = require('sdk/remote/parent');


exports.main = function(options, callbacks) { // eslint-disable-line no-unused-vars
  require('./redirects.js');
  protocols.register();
  //console.log('Addon loaded.');
  parent.remoteRequire('./lib/child-main.js');
};

exports.onUnload = function(reason) { // eslint-disable-line no-unused-vars
  protocols.unregister();
  //console.log('Addon unloaded: ' + reason);
};
