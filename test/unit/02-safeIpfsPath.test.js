'use strict'
/* eslint-env webextensions, mocha */
// eslint-disable-next-line no-unused-vars
/* globals sinon, should, state, safeIpfsPath */

// https://github.com/ipfs/ipfs-companion/issues/303
describe('IPFS Path Sanitization', function () {
  describe('safeIpfsPath(pathOrUrl) should produce no changes', function () {
    it('for URL without special characters', function () {
      const path = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      safeIpfsPath(path).should.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('for path without special characters', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      safeIpfsPath(path).should.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
  })
  describe('safeIpfsPath(pathOrUrl) should normalize', function () {
    it('URL with special characters', function () {
      const path = 'https://ipfs.io/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      safeIpfsPath(path).should.equal('/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1 - Barrel - Part 1')
    })
    it('path with special characters', function () {
      const path = '/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      safeIpfsPath(path).should.equal('/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1 - Barrel - Part 1')
    })
  })
})
