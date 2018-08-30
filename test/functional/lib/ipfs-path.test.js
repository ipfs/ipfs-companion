'use strict'
const { describe, it, beforeEach } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const { safeIpfsPath, createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { initState } = require('../../../add-on/src/lib/state')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { optionDefaults } = require('../../../add-on/src/lib/options')

// https://github.com/ipfs/ipfs-companion/issues/303
describe('ipfs-path.js', function () {
  let state, dnslinkResolver, ipfsPathValidator
  beforeEach(function () {
    global.URL = URL
    state = Object.assign(initState(optionDefaults), { peerCount: 1 })
    const getState = () => state
    dnslinkResolver = createDnslinkResolver(getState)
    ipfsPathValidator = createIpfsPathValidator(getState, dnslinkResolver)
  })
  describe('safeIpfsPath(pathOrUrl) should produce no changes', function () {
    it('for URL without special characters', function () {
      const path = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(safeIpfsPath(path)).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('for path without special characters', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(safeIpfsPath(path)).to.equal('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
  })
  describe('safeIpfsPath(pathOrUrl) should normalize', function () {
    it('URL with special characters', function () {
      const url = 'https://ipfs.io/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      expect(safeIpfsPath(url)).to.equal('/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1 - Barrel - Part 1')
    })
    it('path with special characters', function () {
      const path = '/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1%20-%20Barrel%20-%20Part%201'
      expect(safeIpfsPath(path)).to.equal('/ipfs/Qmb8wsGZNXt5VXZh1pEmYynjB6Euqpq3HYyeAdw2vScTkQ/1 - Barrel - Part 1')
    })
  })
  describe('validIpfsOrIpnsPath', function () {
    // this is just a smoke test, extensive tests are in is-ipfs package
    it('should return true for IPFS NURI', function () {
      const path = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsPathValidator.validIpfsOrIpnsPath(path)).to.equal(true)
    })
    it('should return false for non-IPFS NURI', function () {
      const path = '/ipfs/NotAValidCid'
      expect(ipfsPathValidator.validIpfsOrIpnsPath(path)).to.equal(false)
    })
  })
  describe('validIpfsOrIpnsUrl', function () {
    // this is just a smoke test, extensive tests are in is-ipfs package
    it('should return true for URL at IPFS Gateway', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsPathValidator.validIpfsOrIpnsUrl(url)).to.equal(true)
    })
    it('should return false for non-IPFS URL', function () {
      const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
      expect(ipfsPathValidator.validIpfsOrIpnsUrl(url)).to.equal(false)
    })
  })
  describe('publicIpfsOrIpnsResource', function () {
    it('should return true for URL at Public IPFS Gateway', function () {
      const url = `${state.pubGwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(true)
    })
    it('should return false for URL at Local IPFS Gateway', function () {
      const url = `${state.gwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
    })
    it('should return false for IPFS URL at API port', function () {
      const url = `${state.apiURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
      expect(ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
      expect(ipfsPathValidator.validIpfsOrIpnsUrl(url)).to.equal(true)
    })
    it('should return false for non-IPFS URL', function () {
      const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
      expect(ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
      expect(ipfsPathValidator.validIpfsOrIpnsUrl(url)).to.equal(false)
    })
    describe('isIpfsPageActionsContext', function () {
      it('should return true for URL at Public IPFS Gateway', function () {
        const url = `${state.pubGwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
        expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
      })
      it('should return true for URL at Local IPFS Gateway', function () {
        const url = `${state.gwURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
        expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
      })
      it('should return false for IPFS URL at API port', function () {
        const url = `${state.apiURL}ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest`
        expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(false)
        expect(ipfsPathValidator.validIpfsOrIpnsUrl(url)).to.equal(true)
      })
      it('should return false for non-IPFS URL', function () {
        const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
        expect(ipfsPathValidator.publicIpfsOrIpnsResource(url)).to.equal(false)
        expect(ipfsPathValidator.validIpfsOrIpnsUrl(url)).to.equal(false)
      })
    })
  })
  describe('isIpfsPageActionsContext', function () {
    it('should return true for URL at IPFS Gateway', function () {
      const url = 'https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
    })
    it('should return true for URL at IPFS Gateway with Base32 CIDv1 in subdomain', function () {
      // context-actions are shown on publick gateways that use CID in subdomain as well
      const url = 'http://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy.ipfs.dweb.link/'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(true)
    })
    it('should return false for URL at IPFS Gateway with Base58 CIDv0 in subdomain', function () {
      // context-actions are shown on publick gateways that use CID in subdomain as well
      const url = 'http://QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR.ipfs.dweb.link/'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(false)
    })
    it('should return false for non-IPFS URL', function () {
      const url = 'https://ipfs.io/ipfs/NotACid?argTest#hashTest'
      expect(ipfsPathValidator.isIpfsPageActionsContext(url)).to.equal(false)
    })
  })
})
