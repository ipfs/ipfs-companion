'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const sinon = require('sinon')
const { expect } = require('chai')
const { URL } = require('url')
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const createRuntimeChecks = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier } = require('../../../add-on/src/lib/ipfs-request')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

const url2request = (string) => {
  return {url: string, type: 'main_frame'}
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

// const nodeTypes = ['external', 'embedded']

describe('modifyRequest.onBeforeRequest', function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    global.URL = URL
    global.browser = browser
  })

  beforeEach(async function () {
    state = Object.assign(initState(optionDefaults), {
      ipfsNodeType: 'external',
      peerCount: 1,
      redirect: true,
      catchUnhandledProtocols: true,
      gwURLString: 'http://127.0.0.1:8080',
      pubGwURLString: 'https://ipfs.io'
    })
    const getState = () => state
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('request to FQDN with dnslinkPolicy "eagerDnsTxtLookup"', function () {
    let activeGateway
    beforeEach(function () {
          // Enable the eager dnslinkPolicy (dns txt lookup for every request)
      state.dnslinkPolicy = 'eagerDnsTxtLookup'
          // disable detection of x-ipfs-path to ensure isolated test
          // TODO: create separate 'describe' section  for detectIpfsPathHeader==true
      state.detectIpfsPathHeader = false
          // API is online and has one peer
      state.peerCount = 1
          // embedded node (js-ipfs) defaults to public gw
      activeGateway = (state.ipfsNodeType === 'external' ? state.gwURLString : state.pubGwURLString)
    })
    it('should be redirected to active gateway if dnslink exists', function () {
          // stub the existence of valid dnslink
      const fqdn = 'ipfs.git.sexy'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
          //
      const request = url2request('http://ipfs.git.sexy/index.html?argTest#hashTest')
      expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal(activeGateway + '/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
    })
    it('should be redirected to active gateway if fetched from the same origin and redirect is enabled in non-Firefox', function () {
          // stub the existence of valid dnslink
      const fqdn = 'ipfs.git.sexy'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
          //
      runtime.isFirefox = false
      const xhrRequest = {url: 'http://ipfs.git.sexy/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
      expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal(activeGateway + '/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
    })
    it('should be redirected to active gateway via late redirect if dnslink exists and XHR is cross-origin in Firefox', function () {
          // stub the existence of valid dnslink
      const fqdn = 'ipfs.git.sexy'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
          //
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      runtime.isFirefox = true
      const xhrRequest = {url: 'http://ipfs.git.sexy/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
          // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
      expect(modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
      expect(modifyRequest.onHeadersReceived(xhrRequest).redirectUrl).to.equal(activeGateway + '/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
    })
    it('should be left unouched if dnslink does not exist and XHR is cross-origin in Firefox', function () {
          // stub no dnslink
      const fqdn = 'youtube.com'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns(undefined)
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      runtime.isFirefox = true
      const xhrRequest = {url: 'https://youtube.com/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
          // onBeforeRequest should not change anything
      expect(modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived should not change anything
      expect(modifyRequest.onHeadersReceived(xhrRequest)).to.equal(undefined)
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
