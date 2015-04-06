var proto = require('./protocols.js');
var gw = require('./gateways.js');
const pubGwUri = gw.publicUri();

exports['test ipfsScheme'] = function(assert) {
  assert.equal(proto.ipfsScheme, 'ipfs', 'handler scheme');
};

exports['test ipfsHandler.newURI(ipfs:<path>)'] = function(assert) {
  var path = 'QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/example#/ipfs/QmSsNVuALPa1TW1GDahup8fFDqo95iFyPE7E6HpqDivw3p/readme.md';
  var newURI = proto.ipfsHandler.prototype.newURI('ipfs:' + path, 'utf8', null);
  assert.equal(newURI.scheme, pubGwUri.scheme, 'newURI scheme');
  assert.equal(newURI.host, pubGwUri.host, 'newURI host');
  assert.equal(newURI.path, '/ipfs/' + path, 'newURI path');
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + path, 'newURI spec (full URL)');
};

require('sdk/test').run(exports);
