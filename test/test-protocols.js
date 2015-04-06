var proto = require('./protocols.js');
var gw = require('./gateways.js');
const pubGwUri = gw.publicUri();

let {
  before
} = require('sdk/test/utils');
before(exports, function(name, assert) { // jshint unused:false
  // reset redirect state before each test
  gw.enableHttpGatewayRedirect(button);
});

exports['test ipfsScheme'] = function(assert) {
  assert.equal(proto.ipfsScheme, 'ipfs', 'handler scheme');
};

// ipfs:<path> should be converted to Public Gateway URL
// (which can be redirected to custom one in later steps)
exports['test ipfsHandler.newURI(ipfs:<path>)'] = function(assert) {
  var path = 'QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/example#/ipfs/QmSsNVuALPa1TW1GDahup8fFDqo95iFyPE7E6HpqDivw3p/readme.md';
  var newURI = proto.ipfsHandler.prototype.newURI('ipfs:' + path, 'utf8', null);
  assert.equal(newURI.scheme, pubGwUri.scheme, 'newURI scheme');
  assert.equal(newURI.host, pubGwUri.host, 'newURI host');
  assert.equal(newURI.path, '/ipfs/' + path, 'newURI path');
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + path, 'newURI spec (full URL)');
};

require('sdk/test').run(exports);
