var proto = require('../lib/protocols.js')
var gw = require('../lib/gateways.js')
const prefs = require('sdk/simple-prefs').prefs
const pubGwUri = gw.publicUri
const ipfsPath = 'QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/Makefile#some-hash'
const ipnsPath = 'ipfs.git.sexy'

const ipfsHandler = proto.ipfs.createInstance()
const ipnsHandler = proto.ipns.createInstance()
const fsHandler = proto.fs.createInstance()

const webIpfsHandler = proto['web+ipfs'].createInstance()
const webIpnsHandler = proto['web+ipns'].createInstance()
const webFsHandler = proto['web+fs'].createInstance()

exports['test ipfs: scheme'] = function (assert) {
  assert.equal(ipfsHandler.scheme, 'ipfs', 'handler scheme')
}
exports['test ipns: scheme'] = function (assert) {
  assert.equal(ipnsHandler.scheme, 'ipns', 'handler scheme')
}
exports['test fs: scheme'] = function (assert) {
  assert.equal(fsHandler.scheme, 'fs', 'handler scheme')
}

exports['test web+ipfs scheme'] = function (assert) {
  assert.equal(webIpfsHandler.scheme, 'web+ipfs', 'handler scheme')
}
exports['test web+ipns scheme'] = function (assert) {
  assert.equal(webIpnsHandler.scheme, 'web+ipns', 'handler scheme')
}
exports['test web+fs scheme'] = function (assert) {
  assert.equal(webFsHandler.scheme, 'web+fs', 'handler scheme')
}

// ipfs:<path> / ipns:<path> / ipfs://<path> / ipns://<path>
// should be converted to Public Gateway URL
// (which can be redirected to custom one in later steps)

exports['test newURI(ipfs:<path>)'] = function (assert) {
  var newURI = ipfsHandler.newURI('ipfs:' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}
exports['test newURI(ipfs://<path>)'] = function (assert) {
  var newURI = ipfsHandler.newURI('ipfs://' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}
exports['test newURI(web+ipfs:<path>)'] = function (assert) {
  var newURI = webIpfsHandler.newURI('web+ipfs:' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}
exports['test newURI(web+ipfs://<path>)'] = function (assert) {
  var newURI = webIpfsHandler.newURI('web+ipfs://' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}
exports['test newURI(ipfs:/ipfs/<path>)'] = function (assert) {
  var newURI = ipfsHandler.newURI('ipfs:/ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(ipns:<path>)'] = function (assert) {
  var newURI = ipnsHandler.newURI('ipns:' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}
exports['test newURI(ipns://<path>)'] = function (assert) {
  var newURI = ipnsHandler.newURI('ipns://' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}
exports['test newURI(web+ipns:<path>)'] = function (assert) {
  var newURI = webIpnsHandler.newURI('web+ipns:' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}
exports['test newURI(web+ipns://<path>)'] = function (assert) {
  var newURI = webIpnsHandler.newURI('web+ipns://' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}
exports['test newURI(ipns:/ipns/<path>)'] = function (assert) {
  var newURI = ipnsHandler.newURI('ipns:/ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

// The fs:<resource> protocol for easier interoperability with legacy applications
// It is a simple prefix to the canonical UNIX-like IPFS address
// Discussed at length in https://github.com/ipfs/go-ipfs/issues/1678#issuecomment-142600157

exports['test newURI(fs:ipfs/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs:ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(fs:/ipfs/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs:/ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(fs://ipfs/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs://ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(fs:///ipfs/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs:///ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(fs:ipns/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs:ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test newURI(fs:/ipns/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs:/ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test newURI(fs://ipns/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs://ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test newURI(fs:///ipns/<path>)'] = function (assert) {
  var newURI = fsHandler.newURI('fs:///ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

// web+ variant (https://github.com/lidel/ipfs-firefox-addon/issues/36)
exports['test newURI(web+fs:ipfs/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs:ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(web+fs:/ipfs/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs:/ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(web+fs://ipfs/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs://ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(web+fs:///ipfs/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs:///ipfs/' + ipfsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipfs/' + ipfsPath, 'newURI spec')
}

exports['test newURI(web+fs:ipns/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs:ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test newURI(web+fs:/ipns/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs:/ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test newURI(web+fs://ipns/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs://ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test newURI(web+fs:///ipns/<path>)'] = function (assert) {
  var newURI = webFsHandler.newURI('web+fs:///ipns/' + ipnsPath, 'utf8', null)
  assert.equal(newURI.spec, pubGwUri.spec + 'ipns/' + ipnsPath, 'newURI spec')
}

exports['test protocol rewrite'] = function (assert) {
  prefs.fsUris = true

  assert.equal(proto.rewrite('ipfs:QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'),
    'https://ipfs.io/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm', '#1')

  assert.equal(proto.rewrite('ipns:ipfs.io'), 'https://ipfs.io/ipns/ipfs.io', '#2')

  assert.equal(proto.rewrite('fs:/ipns/ipfs.io'), 'fs:/ipns/ipfs.io', '#3')

  assert.equal(proto.rewrite('/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'),
    'fs:/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm', '#4')

  assert.equal(proto.rewrite('/ipfs/not-a-multihash'), '/ipfs/not-a-multihash', '#5')
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
