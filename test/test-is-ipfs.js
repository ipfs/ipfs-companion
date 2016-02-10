'use strict'

const isIPFS = require('../lib/npm/is-ipfs.js')

exports['test IPFS/IPNS URL/Path and Multihash detection'] = function (assert) {
  assert.equal(isIPFS.multihash('QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o'), true, '#1')
  assert.equal(isIPFS.multihash('noop'), false, '#2')

  assert.equal(isIPFS.url('https://ipfs.io/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'), true, '#3.1')
  assert.equal(isIPFS.url('http://ipfs.io/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'), true, '#3.2')
  assert.equal(isIPFS.url('http://ipfs.io/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnEtE0'), false, '#3.3')
  assert.equal(isIPFS.url('https://ipfs.io/ipfs/github.com'), false, '#4.1')
  assert.equal(isIPFS.url('http://ipfs.io/ipfs/github.com'), false, '#4.2')
  assert.equal(isIPFS.url('https://github.com/ipfs/js-ipfs/blob/master/README.md'), false, '#5.1')
  assert.equal(isIPFS.url('http://github.com/ipfs/js-ipfs/blob/master/README.md'), false, '#5.2')
  assert.equal(isIPFS.url('https://google.com'), false, '#6.1')
  assert.equal(isIPFS.url('http://google.com'), false, '#6.2')

  assert.equal(isIPFS.ipfsUrl('https://ipfs.io/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'), true, '#7')
  assert.equal(isIPFS.ipfsUrl('https://ipfs.io/ipfs/github.com'), false, '#8')

  assert.equal(isIPFS.ipnsUrl('https://ipfs.io/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'), false, '#9')
  assert.equal(isIPFS.ipnsUrl('https://ipfs.io/ipns/github.com'), true, '#10')

  assert.equal(isIPFS.path('/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnctEm'), true, '#11')
  assert.equal(isIPFS.path('/ipfs/QmYHNYAaYK5hm3ZhZFx5W9H6xydKDGimjdgJMrMSdnEtE0'), false, '#12')
  assert.equal(isIPFS.path('/ipfs/github.com'), false, '#13')
  assert.equal(isIPFS.path('/ipfs/js-ipfs/blob/master/README.md'), false, '#14')
  assert.equal(isIPFS.path('/foo.bar/ipns/boo.om'), false, '#15')
}

// require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
