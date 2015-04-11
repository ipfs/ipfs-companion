var proto = require('./protocols.js');
var gw = require('./gateways.js');
const pubGwUri = gw.publicUri();
const ipfsPath = 'QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/example#/ipfs/QmSsNVuALPa1TW1GDahup8fFDqo95iFyPE7E6HpqDivw3p/readme.md';
const ipnsPath = 'ipfs.git.sexy';

exports['test ipfsScheme'] = function(assert) {
  assert.equal(proto.ipfsScheme, 'ipfs', 'handler scheme');
};

// ipfs:<path> / ipns:<path> / ipfs://<path> / ipns://<path>
// should be converted to Public Gateway URL
// (which can be redirected to custom one in later steps)

exports['test newURI(ipfs:<path>)'] = function(assert) {
  var newURI = proto.ipfsHandler.prototype.newURI('ipfs:' + ipfsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec');
};

exports['test newURI(ipfs://<path>)'] = function(assert) {
  var newURI = proto.ipfsHandler.prototype.newURI('ipfs://' + ipfsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec');
};


exports['test newURI(ipns:<path>)'] = function(assert) {
  var newURI = proto.ipnsHandler.prototype.newURI('ipns:' + ipnsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec');
};

exports['test newURI(ipns:<path>)'] = function(assert) {
  var newURI = proto.ipnsHandler.prototype.newURI('ipns://' + ipnsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec');
};


require('sdk/test').run(exports);
