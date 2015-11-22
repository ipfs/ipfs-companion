var proto = require('../lib/protocols.js');
var gw = require('../lib/gateways.js');
const pubGwUri = gw.publicUri();
const ipfsPath = 'QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/example#/ipfs/QmSsNVuALPa1TW1GDahup8fFDqo95iFyPE7E6HpqDivw3p/readme.md';
const ipnsPath = 'ipfs.git.sexy';

exports['test ipfsScheme'] = function(assert) {
  assert.equal(proto.ipfsScheme, 'ipfs', 'handler scheme');
};

exports['test ipnsScheme'] = function(assert) {
  assert.equal(proto.ipnsScheme, 'ipns', 'handler scheme');
};

exports['test fsScheme'] = function(assert) {
  assert.equal(proto.fsScheme, 'fs', 'handler scheme');
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

// The fs:<resource> protocol for easier interoperability with legacy applications
// It is a simple prefix to the canonical UNIX-like IPFS address
// Discussed at length in https://github.com/ipfs/go-ipfs/issues/1678#issuecomment-142600157

exports['test newURI(fs:ipfs/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs:ipfs/' + ipfsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec');
};

exports['test newURI(fs:/ipfs/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs:/ipfs/' + ipfsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec');
};

exports['test newURI(fs://ipfs/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs://ipfs/' + ipfsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec');
};

exports['test newURI(fs:///ipfs/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs:///ipfs/' + ipfsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec');
};

exports['test newURI(fs:ipns/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs:ipns/' + ipnsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec');
};

exports['test newURI(fs:/ipns/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs:/ipns/' + ipnsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec');
};

exports['test newURI(fs://ipns/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs://ipns/' + ipnsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec');
};

exports['test newURI(fs:///ipns/<path>)'] = function(assert) {
  var newURI = proto.fsHandler.prototype.newURI('fs:///ipns/' + ipnsPath, 'utf8', null);
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec');
};


require('sdk/test').run(exports);
