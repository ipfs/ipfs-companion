'use strict'

const isIPFS = require('../lib/npm/is-ipfs.js')

exports['test IPFS/IPNS URL and multihash detection'] = function (assert) {
  assert.equal(isIPFS.multihash('QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'), true, '#1')
  assert.equal(isIPFS.multihash('noop'), false, '#2')

  assert.equal(isIPFS.url('https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'), true, '#3.1')
  assert.equal(isIPFS.url('http://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'), true, '#3.2')
  assert.equal(isIPFS.url('https://ipfs.io/ipfs/github.com'), false, '#4.1')
  assert.equal(isIPFS.url('http://ipfs.io/ipfs/github.com'), false, '#4.2')
  assert.equal(isIPFS.url('https://github.com/ipfs/js-ipfs/blob/master/README.md'), false, '#5.1')
  assert.equal(isIPFS.url('http://github.com/ipfs/js-ipfs/blob/master/README.md'), false, '#5.2')
  assert.equal(isIPFS.url('https://google.com'), false, '#6.1')
  assert.equal(isIPFS.url('http://google.com'), false, '#6.2')

  assert.equal(isIPFS.ipfsUrl('https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'), true, '#7')
  assert.equal(isIPFS.ipfsUrl('https://ipfs.io/ipfs/github.com'), false, '#8')

  assert.equal(isIPFS.ipnsUrl('https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'), false, '#9')
  assert.equal(isIPFS.ipnsUrl('https://ipfs.io/ipns/github.com'), true, '#10')
}

// require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
