'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const sinon = require('sinon')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')

function setFakeDnslink (fqdn, dnslinkResolver) {
  // stub the existence of valid dnslink
  dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
}

describe('when dnslinkPolicy is "eagerDnsTxtLookup"', function () {
  before(() => {
    global.URL = URL
  })

  const getState = () => ({
    gwURL: new URL('http://127.0.0.1:8080'),
    pubGwURL: new URL('https://gateway.foobar.io'),
    ipfsNodeType: 'external',
    dnslinkPolicy: 'eagerDnsTxtLookup',
    peerCount: 1
  })
  const getExternalNodeState = () => Object.assign({}, getState(), {ipfsNodeType: 'external'})
  const getEmbeddedNodeState = () => Object.assign({}, getState(), {ipfsNodeType: 'embedded'})

  describe('dnslinkRedirect(url)', function () {
    it('should return nothing if dnslink is present but path starts with /api/v0/', function () {
      const url = new URL('https://dnslinksite1.io/api/v0/dns/ipfs.io')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkRedirect(url.toString())).to.equal(undefined)
    })
    it('should return nothing if dnslink is present but path starts with /ipfs/', function () {
      const url = new URL('https://dnslinksite2.io/ipfs/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkRedirect(url.toString())).to.equal(undefined)
    })
    it('should return nothing if dnslink is present but path starts with /ipfs/', function () {
      const url = new URL('https://dnslinksite3.io/ipns/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkRedirect(url.toString())).to.equal(undefined)
    })
    it('with external node should return redirect to custom gateway if dnslink is present and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getExternalNodeState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkRedirect(url.toString()).redirectUrl)
          .to.equal('http://127.0.0.1:8080/ipns/dnslinksite4.io/foo/barl?a=b#c=d')
    })
    it('with embedded node should return redirect to public gateway if dnslink is present and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getEmbeddedNodeState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkRedirect(url.toString()).redirectUrl)
          .to.equal('https://gateway.foobar.io/ipns/dnslinksite4.io/foo/barl?a=b#c=d')
    })
  })

  describe('redirectToIpnsPath(url)', function () {
    describe('with external gateway', function () {
      it('should return IPNS path at a custom gateway', function () {
        const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
        const dnslinkResolver = createDnslinkResolver(getExternalNodeState)
        expect(dnslinkResolver.redirectToIpnsPath(url).redirectUrl)
          .to.equal('http://127.0.0.1:8080/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      })
    })

    describe('with embedded gateway', function () {
      it('should return IPNS path at a public gateway', function () {
        const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
        const dnslinkResolver = createDnslinkResolver(getEmbeddedNodeState)
        expect(dnslinkResolver.redirectToIpnsPath(url).redirectUrl)
          .to.equal('https://gateway.foobar.io/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      })
    })
  })

  describe('canRedirectToIpns(url)', function () {
    it('should return false if dnslink is present but path starts with /api/v0/', function () {
      const url = new URL('https://dnslinksite1.io/api/v0/dns/ipfs.io')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
    })
    it('should return false if dnslink is present but path starts with /ipfs/', function () {
      const url = new URL('https://dnslinksite2.io/ipfs/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
    })
    it('should return false if dnslink is present but path starts with /ipfs/', function () {
      const url = new URL('https://dnslinksite3.io/ipns/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
    })
    it('should return true if dnslink is present and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      setFakeDnslink(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(true)
    })
  })

  after(() => {
    delete global.URL
  })
})
