'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const createDnsLink = require('../../../add-on/src/lib/dns-link')

// https://github.com/ipfs/ipfs-companion/issues/303
describe('DNSLINK', function () {
  before(() => {
    global.URL = URL
  })

  describe('redirectToIpnsPath(url) with external gateway', function () {
    it('should return IPNS path at a custom gateway', async function () {
      const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      const getState = () => ({
        gwURL: new URL('http://127.0.0.1:8080'),
        pubGwURL: new URL('https://ipfs.io'),
        ipfsNodeType: 'external'
      })
      const dnsLink = createDnsLink(getState)
      expect(dnsLink.redirectToIpnsPath(url).redirectUrl)
        .to.equal('http://127.0.0.1:8080/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
    })
  })

  describe('redirectToIpnsPath(url) with embedded gateway', function () {
    it('should return IPNS path at a public gateway', async function () {
      const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      const getState = () => ({
        gwURL: new URL('http://127.0.0.1:8080'),
        pubGwURL: new URL('https://ipfs.io'),
        ipfsNodeType: 'embedded'
      })
      const dnsLink = createDnsLink(getState)
      expect(dnsLink.redirectToIpnsPath(url).redirectUrl)
        .to.equal('https://ipfs.io/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
    })
  })

  after(() => {
    delete global.URL
  })
})
