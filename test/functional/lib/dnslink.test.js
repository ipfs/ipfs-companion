'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const sinon = require('sinon')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { initState } = require('../../../add-on/src/lib/state')
const { optionDefaults } = require('../../../add-on/src/lib/options')

const testOptions = Object.assign({}, optionDefaults, {
  customGatewayUrl: 'http://127.0.0.1:8080',
  publicGatewayUrl: 'https://gateway.foobar.io'
})

const dnslinkValue = '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'

function spoofDnsTxtRecord (fqdn, dnslinkResolver, value) {
  // spoofs existence of valid DNS TXT record (used on cache miss)
  dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns(value)
}
module.exports.spoofDnsTxtRecord = spoofDnsTxtRecord

function spoofCachedDnslink (fqdn, dnslinkResolver, value) {
  // spoofs existence of valid DNS TXT record (used on cache miss)
  dnslinkResolver.setDnslink(fqdn, value)
}
module.exports.spoofCachedDnslink = spoofCachedDnslink

function expectNoDnsTxtRecordLookup (fqdn, dnslinkResolver) {
  dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).throws('unexpected DNS TXT lookup', 'only cache should be used')
}

// dnslinkPolicy-agnostic tests
describe('dnslinkResolver', function () {
  before(() => {
    global.URL = URL
  })

  const getState = () => Object.assign(initState(testOptions), {
    peerCount: 1
  })
  const getExternalNodeState = () => Object.assign({}, getState(), { ipfsNodeType: 'external' })
  // const getEmbeddedNodeState = () => Object.assign({}, getState(), { ipfsNodeType: 'embedded' })

  describe('convertToIpnsPath(url)', function () {
    it('should return IPNS path', function () {
      const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getExternalNodeState)
      expect(dnslinkResolver.convertToIpnsPath(url))
        .to.equal('/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
    })
  })
})

// in this mode lookups are triggered externally, so all methods should work 'offline' using data from internal DNSLink cache
describe('dnslinkResolver (dnslinkPolicy=detectIpfsPathHeader)', function () {
  before(() => {
    global.URL = URL
  })

  const getState = () => Object.assign(initState(testOptions), {
    ipfsNodeType: 'external',
    dnslinkPolicy: 'detectIpfsPathHeader',
    peerCount: 1
  })
  const getExternalNodeState = () => Object.assign(getState(), { ipfsNodeType: 'external' })
  const getEmbeddedNodeState = () => Object.assign(getState(), { ipfsNodeType: 'embedded' })

  describe('dnslinkAtGateway(url)', function () {
    ['/api/v0/foo', '/ipfs/foo', '/ipns/foo'].forEach(path => {
      it('should return nothing if dnslink is present in cache but path starts with ' + path, function () {
        const url = new URL('https://dnslinksite1.io' + path)
        const dnslinkResolver = createDnslinkResolver(getState)
        dnslinkResolver.setDnslink(url.hostname, '/ipfs/bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge')
        expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
        expect(dnslinkResolver.dnslinkAtGateway(url.toString())).to.equal(undefined)
      })
    })
    it('[external node] should return redirect to custom gateway if dnslink is present in cache', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getExternalNodeState)
      dnslinkResolver.setDnslink(url.hostname, '/ipfs/bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge')
      expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
      // note: locahost will redirect to subdomain if its go-ipfs >0.5,
      // so companion does not need to handle that
      expect(dnslinkResolver.dnslinkAtGateway(url.toString()))
        .to.equal('http://localhost:8080/ipns/dnslinksite4.io/foo/barl?a=b#c=d')
    })
    it('[embedded node] should return redirect to public gateway if dnslink is present in cache', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getEmbeddedNodeState)
      dnslinkResolver.setDnslink(url.hostname, '/ipfs/bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge')
      expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkAtGateway(url.toString()))
        .to.equal('https://gateway.foobar.io/ipns/dnslinksite4.io/foo/barl?a=b#c=d')
    })
    it('[external node] should not return redirect to custom gateway if dnslink is not in cache and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getExternalNodeState)
      dnslinkResolver.clearCache()
      expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkAtGateway(url.toString())).to.equal(undefined)
    })
    it('[embedded node] should not return redirect to public gateway if dnslink is not in cache and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getEmbeddedNodeState)
      dnslinkResolver.clearCache()
      expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
      expect(dnslinkResolver.dnslinkAtGateway(url.toString())).to.equal(undefined)
    })
  })

  describe('canRedirectToIpns(url)', function () {
    const httpGatewayPaths = ['/api/v0/foo', '/ipfs/foo', '/ipns/foo']
    httpGatewayPaths.forEach(path => {
      it('should return false if dnslink is present in cache but path starts with /api/v0/', function () {
        const url = new URL('https://dnslinksite1.io' + path)
        const dnslinkResolver = createDnslinkResolver(getState)
        dnslinkResolver.setDnslink(url.hostname, '/ipfs/bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge')
        expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
        expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
      })
    })
    const dnslinkCacheStates = [true, false]
    dnslinkCacheStates.forEach(cached => {
      it(`should return ${cached} if dnslink is ${cached ? 'present' : 'not'} in cache and path does not belong to an HTTP gateway`, function () {
        const url = new URL('https://dnslinksite4.io/foo/bar')
        const dnslinkResolver = createDnslinkResolver(getState)
        if (cached) {
          dnslinkResolver.setDnslink(url.hostname, '/ipfs/bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge')
        } else {
          dnslinkResolver.clearCache()
        }
        expectNoDnsTxtRecordLookup(url.hostname, dnslinkResolver)
        expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(cached)
      })
    })
  })
})

// this policy triggers actual DNS TXT lookups
describe('dnslinkResolver (dnslinkPolicy=enabled)', function () {
  before(() => {
    global.URL = URL
  })

  const getState = () => Object.assign(initState(testOptions), {
    ipfsNodeType: 'external',
    dnslinkPolicy: 'enabled',
    peerCount: 1
  })
  const getExternalNodeState = () => Object.assign(getState(), { ipfsNodeType: 'external' })
  const getEmbeddedNodeState = () => Object.assign(getState(), { ipfsNodeType: 'embedded' })

  describe('dnslinkAtGateway(url)', function () {
    ['/api/v0/foo', '/ipfs/foo', '/ipns/foo'].forEach(path => {
      it('should return nothing if DNS TXT record is present but path starts with ' + path, function () {
        const url = new URL('https://dnslinksite1.io' + path)
        const dnslinkResolver = createDnslinkResolver(getState)
        spoofDnsTxtRecord(url.hostname, dnslinkResolver, dnslinkValue)
        expect(dnslinkResolver.dnslinkAtGateway(url.toString())).to.equal(undefined)
      })
    })
    it('[external node] should return redirect to custom gateway if DNS TXT record is present and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getExternalNodeState)
      spoofDnsTxtRecord(url.hostname, dnslinkResolver, dnslinkValue)
      // note: locahost will redirect to subdomain if its go-ipfs >0.5,
      // so companion does not need to handle that
      expect(dnslinkResolver.dnslinkAtGateway(url.toString()))
        .to.equal('http://localhost:8080/ipns/dnslinksite4.io/foo/barl?a=b#c=d')
    })
    it('[embedded node] should return redirect to public gateway if DNS TXT record is present and path does not belong to a gateway', function () {
      const url = new URL('https://dnslinksite4.io/foo/barl?a=b#c=d')
      const dnslinkResolver = createDnslinkResolver(getEmbeddedNodeState)
      spoofDnsTxtRecord(url.hostname, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.dnslinkAtGateway(url.toString()))
        .to.equal('https://gateway.foobar.io/ipns/dnslinksite4.io/foo/barl?a=b#c=d')
    })
  })

  describe('canRedirectToIpns(url)', function () {
    it('should return false if dnslink is present but path starts with /api/v0/', function () {
      const url = new URL('https://dnslinksite1.io/api/v0/dns/ipfs.io')
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(url.hostname, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
    })
    it('should return false if dnslink is present but path starts with /ipfs/', function () {
      const url = new URL('https://dnslinksite2.io/ipfs/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(url.hostname, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
    })
    it('should return false if dnslink is present but path starts with /ipfs/', function () {
      const url = new URL('https://dnslinksite3.io/ipns/foo/bar')
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(url.hostname, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(false)
    })
    const dnsTxtRecordPresence = [undefined, '/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR']
    dnsTxtRecordPresence.forEach(present => {
      it(`should return ${Boolean(present)} if DNS TXT record is ${present ? 'present' : 'missing'} and path does not belong to an HTTP gateway`, function () {
        const url = new URL('https://dnslinksite4.io/foo/bar')
        const dnslinkResolver = createDnslinkResolver(getState)
        spoofDnsTxtRecord(url.hostname, dnslinkResolver, present)
        expect(dnslinkResolver.canRedirectToIpns(url)).to.equal(Boolean(present))
      })
    })
  })

  describe('findDNSLinkHostname(url)', function () {
    it('should match <fqdn> directly', function () {
      const fqdn = 'dnslink-site.com'
      const url = new URL(`https://${fqdn}/some/path?ds=sdads#dfsdf`)
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(fqdn, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.findDNSLinkHostname(url)).to.equal(fqdn)
    })
    it('should return nothing if no DNSLink record', function () {
      const url = new URL('https://no-dnslink.example.com/some/path?ds=sdads#dfsdf')
      const dnslinkResolver = createDnslinkResolver(getState)
      expect(dnslinkResolver.findDNSLinkHostname(url)).to.equal(undefined)
    })
    it('should match /ipns/<fqdn> on path gateway', function () {
      const fqdn = 'dnslink-site.com'
      const url = `https://path-gateway.com/ipns/${fqdn}/some/path?ds=sdads#dfsdf`
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(fqdn, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.findDNSLinkHostname(url)).to.equal(fqdn)
    })
    it('should match <fqdn>.ipns on local subdomain gateway', function () {
      const fqdn = 'dnslink-site.com'
      const url = `https://${fqdn}.ipns.localhost:8080/some/path?ds=sdads#dfsdf`
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(fqdn, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.findDNSLinkHostname(url)).to.equal(fqdn)
    })
    it('should match <fqdn>.ipns on public subdomain gateway', function () {
      const fqdn = 'dnslink-site.com'
      const url = `https://${fqdn}.ipns.dweb.link/some/path?ds=sdads#dfsdf`
      const dnslinkResolver = createDnslinkResolver(getState)
      spoofDnsTxtRecord(fqdn, dnslinkResolver, dnslinkValue)
      expect(dnslinkResolver.findDNSLinkHostname(url)).to.equal(fqdn)
    })
  })

  after(() => {
    delete global.URL
  })
})
