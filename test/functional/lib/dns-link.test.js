'use strict'
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const createDnsLink = require('../../../add-on/src/lib/dns-link')

// https://github.com/ipfs/ipfs-companion/issues/303
describe('DNSLINK', function () {
  describe('redirectToIpnsPath(url)', function () {
    it('should return IPNS path at a custom gateway', function () {
      const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      const getState = () => ({ gwURL: new URL('http://127.0.0.1:8080') })
      const dnsLink = createDnsLink(getState)
      expect(dnsLink.redirectToIpnsPath(url).redirectUrl)
        .to.equal('http://127.0.0.1:8080/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
    })
  })
})
