'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const sinon = require('sinon')
const { expect } = require('chai')
const { URL } = require('url')
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const { createRuntimeChecks } = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier, redirectOptOutHint } = require('../../../add-on/src/lib/ipfs-request')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

const url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

const expectNoRedirect = (modifyRequest, request) => {
  expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
  expect(modifyRequest.onHeadersReceived(request)).to.equal(undefined)
}

const nodeTypes = ['external', 'embedded']

describe('modifyRequest.onBeforeRequest:', function () {
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
      dnslinkPolicy: false, // dnslink testi suite is in ipfs-request-dnslink.test.js
      catchUnhandledProtocols: true,
      gwURLString: 'http://localhost:8080',
      gwURL: new URL('http://localhost:8080'),
      pubGwURLString: 'https://ipfs.io',
      pubGwURL: new URL('https://ipfs.io'),
      pubSubdomainGwURLString: 'https://dweb.link',
      pubSubdomainGwURL: new URL('https://dweb.link')
    })
    const getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('request for a path matching /ipfs/{CIDv0}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if redirect is enabled', function () {
        const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
    })
    describe('with embedded node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'embedded'
      })
      it('should be served from public gateway if redirect is enabled', function () {
        const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
    })
    describe('with every node type', function () {
      // tests in which results should be the same for all node types
      nodeTypes.forEach(function (nodeType) {
        beforeEach(function () {
          state.ipfsNodeType = nodeType
        })
        it(`should be left untouched if redirect is disabled (${nodeType} node)`, function () {
          state.redirect = false
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
          expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if redirect is enabled but global active flag is OFF (${nodeType} node)`, function () {
          state.active = false
          state.redirect = true
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
          expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if URL includes opt-out hint (${nodeType} node)`, function () {
          // A safe way for preloading data at arbitrary gateways - it should arrive at original destination
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect#hashTest')
          expectNoRedirect(modifyRequest, request)
          expect(redirectOptOutHint).to.equal('x-ipfs-companion-no-redirect')
        })
        it(`should be left untouched if request is for subresource on a page loaded from URL that includes opt-out hint (${nodeType} node)`, function () {
          // ensure opt-out works for subresources (Firefox only for now)
          const subRequest = {
            type: 'script',
            url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            originUrl: 'https://example.com/?x-ipfs-companion-no-redirect#hashTest'
          }
          expectNoRedirect(modifyRequest, subRequest)
        })
        it(`should be left untouched if CID is invalid (${nodeType} node)`, function () {
          const request = url2request('https://google.com/ipfs/notacid?argTest#hashTest')
          expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if its is a HEAD preload with explicit opt-out in URL hash (${nodeType} node)`, function () {
          // HTTP HEAD is a popular way for preloading data at arbitrary gateways, so we have a dedicated test to make sure it works as expected
          const headRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#x-ipfs-companion-no-redirect', method: 'HEAD' }
          expectNoRedirect(modifyRequest, headRequest)
        })
      })
    })
  })

  describe('XHR request for a path matching /ipfs/{CIDv0} coming from 3rd party Origin', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/' }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Chromium', function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/' }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in Chromium', function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
    })
    describe('with embedded node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'embedded'
      })
      it('should be served from public gateway if fetched from the same origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/' }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from public gateway if fetched from the same origin and redirect is enabled in Chromium', function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/' }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from public gateway if XHR is cross-origin and redirect is enabled in Chromium', function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from public gateway if XHR is cross-origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
    })
    describe('with external node when runtime.requiresXHRCORSfix', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
        browser.runtime.getBrowserInfo = () => Promise.resolve({ name: 'Firefox', version: '68.0.0' })
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/' }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in non-Firefox', function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/' }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in non-Firefox', function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway via late redirect in onHeadersReceived if XHR is cross-origin and redirect is enabled in Firefox', function () {
        // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
        // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
        expect(modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
        // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
        expect(modifyRequest.onHeadersReceived(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
    })
  })

  describe('request for a path matching /ipns/{path}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if {path} points to a FQDN with existing dnslink', function () {
        const request = url2request('https://google.com/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
        // stub the existence of valid dnslink
        const fqdn = 'ipfs.git.sexy'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
        // pretend API is online and we can do dns lookups with it
        state.peerCount = 1
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://localhost:8080/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      })
      it('should be served from custom gateway if {path} starts with a valid PeerID', function () {
        const request = url2request('https://google.com/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().returns(false)
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://localhost:8080/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
      })
    })

    describe('with embedded node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'embedded'
      })
      it('should be served from public gateway if {path} points to a FQDN with existing dnslink', function () {
        const request = url2request('https://google.com/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
        // stub the existence of valid dnslink
        const fqdn = 'ipfs.git.sexy'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
        // pretend API is online and we can do dns lookups with it
        state.peerCount = 1
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      })
      it('should be served from public gateway if {path} starts with a valid PeerID', function () {
        const request = url2request('https://google.com/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().returns(false)
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
      })
    })

    describe('with every node type', function () {
      // tests in which results should be the same for all node types
      nodeTypes.forEach(function (nodeType) {
        beforeEach(function () {
          state.ipfsNodeType = nodeType
        })
        it(`should be left untouched if redirect is disabled' (${nodeType} node)`, function () {
          state.redirect = false
          const request = url2request('https://google.com/ipns/ipfs.io?argTest#hashTest')
          expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if FQDN is not a real domain nor a valid CID (${nodeType} node)`, function () {
          const request = url2request('https://google.com/ipns/notafqdnorcid?argTest#hashTest')
          dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().returns(false)
          expectNoRedirect(modifyRequest, request)
        })
      })
    })
  })

  describe('request to a subdomain gateway', function () {
    const cid = 'bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge'
    const peerid = 'bafzbeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge'

    // Tests use different CID in X-Ipfs-Path header just to ensure it does not
    // override the one from path
    const fakeXIpfsPathHdrVal = '/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ'

    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
        // dweb.link is the default subdomain gw
      })
      it('should be redirected to localhost gateway (*.ipfs on default gw)', function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.dweb.link/`)

        // X-Ipfs-Path to ensure value from URL takes a priority
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: fakeXIpfsPathHdrVal }]

        /// We expect redirect to path-based gateway because go-ipfs >=0.5 will
        // return redirect to a subdomain, and we don't want to break users
        // running older versions of go-ipfs by loading subdomain first and
        // failing.
        expect(modifyRequest.onBeforeRequest(request).redirectUrl)
          .to.equal(`http://localhost:8080/ipfs/${cid}/`)
      })
      it('should be redirected to localhost gateway (*.ipfs on 3rd party gw)', function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.cf-ipfs.com/`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: fakeXIpfsPathHdrVal }]
        expect(modifyRequest.onBeforeRequest(request).redirectUrl)
          .to.equal(`http://localhost:8080/ipfs/${cid}/`)
      })
      it('should be redirected to localhost gateway and keep URL encoding of original path', function () {
        state.redirect = true
        const request = url2request('https://bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy.ipfs.dweb.link/%3Ffilename=test.jpg?arg=val')
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: fakeXIpfsPathHdrVal }]
        expect(modifyRequest.onBeforeRequest(request).redirectUrl)
          .to.equal('http://localhost:8080/ipfs/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy/%3Ffilename=test.jpg?arg=val')
      })
      it('should be redirected to localhost gateway (*.ipns on default gw)', function () {
        state.redirect = true
        const request = url2request(`https://${peerid}.ipns.dweb.link/`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ' }]
        expect(modifyRequest.onBeforeRequest(request).redirectUrl)
          .to.equal(`http://localhost:8080/ipns/${peerid}/`)
      })
    })

    describe('with embedded node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'embedded'
        // dweb.link is the default subdomain gw
      })
      it('should be left untouched for *.ipfs at default public subdomain gw', function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.dweb.link/`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: fakeXIpfsPathHdrVal }]
        expectNoRedirect(modifyRequest, request)
      })
      it('should be redirected to user-prefered public gateway if 3rd party subdomain gw', function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.cf-ipfs.com/`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: fakeXIpfsPathHdrVal }]
        expect(modifyRequest.onBeforeRequest(request).redirectUrl)
          .to.equal(`https://${cid}.ipfs.dweb.link/`)
      })
      it('should be left untouched for *.ipns at default public subdomain gw', function () {
        state.redirect = true
        const request = url2request(`https://${peerid}.ipns.dweb.link/`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ' }]
        expectNoRedirect(modifyRequest, request)
      })
    })
  })

  // tests in which results should be the same for all node types
  nodeTypes.forEach(function (nodeType) {
    beforeEach(function () {
      state.ipfsNodeType = nodeType
      state.redirect = true
    })
    describe(`with ${nodeType} node:`, function () {
      describe('request for IPFS path at the localhost', function () {
        // we do not touch local requests, as it may interfere with other nodes running at the same machine
        // or could produce false-positives such as redirection from localhost:5001/ipfs/path to localhost:8080/ipfs/path
        it('should fix localhost API hostname to IP', function () {
          const request = url2request('http://localhost:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          // expectNoRedirect(modifyRequest, request)
          expect(modifyRequest.onBeforeRequest(request).redirectUrl)
            .to.equal('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
        })
        it('should be left untouched if localhost Gateway is used', function () {
          const request = url2request('http://localhost:8080/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          expectNoRedirect(modifyRequest, request)
        })
        it('should fix 127.0.0.1 Gateway to localhost', function () {
          const request = url2request('http://127.0.0.1:8080/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          // expectNoRedirect(modifyRequest, request)
          expect(modifyRequest.onBeforeRequest(request).redirectUrl)
            .to.equal('http://localhost:8080/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
        })
        it('should fix 0.0.0.0 to localhost IP API', function () {
          // https://github.com/ipfs-shipyard/ipfs-companion/issues/867
          const request = url2request('http://0.0.0.0:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl)
            .to.equal('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
        })
        it('should fix localhost API to IP', function () {
          // https://github.com/ipfs/ipfs-companion/issues/291
          const request = url2request('http://localhost:5001/webui')
          // expectNoRedirect(modifyRequest, request)
          expect(modifyRequest.onBeforeRequest(request).redirectUrl)
            .to.equal('http://127.0.0.1:5001/webui')
        })
        it('should be left untouched if localhost API IP is used, even when x-ipfs-path is present', function () {
          // https://github.com/ipfs-shipyard/ipfs-companion/issues/604
          const request = url2request('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DDIFF' }]
          expectNoRedirect(modifyRequest, request)
        })
        it('should be left untouched if [::1] is used', function () {
          // https://github.com/ipfs/ipfs-companion/issues/291
          const request = url2request('http://[::1]:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          expectNoRedirect(modifyRequest, request)
        })
        it('should be redirected to localhost (subdomain in go-ipfs >0.5) if type=main_frame and  127.0.0.1 (path gw) is used un URL', function () {
          state.redirect = true
          state.useSubdomains = true
          expect(state.gwURL.hostname).to.equal('localhost')
          const cid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
          const request = url2request(`http://127.0.0.1:8080/ipfs/${cid}?arg=val#hash`)
          request.type = 'main_frame' // explicit
          expect(modifyRequest.onBeforeRequest(request).redirectUrl)
            .to.equal(`http://localhost:8080/ipfs/${cid}?arg=val#hash`)
        })
      })
    })
  })

  describe('request for IPFS Path with redirect to custom gateway at port 80', function () {
    beforeEach(function () {
      state.ipfsNodeType = 'external'
      state.redirect = true
    })
    it('should work for HTTP GW without explicit port in URL', function () {
      state.gwURLString = 'http://foo:80/'
      state.gwURL = new URL(state.gwURLString)
      const request = url2request('https://bar.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://foo/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
    it('should work for HTTPS GW without explicit port in URL', function () {
      state.gwURLString = 'https://foo:443/'
      state.gwURL = new URL(state.gwURLString)
      const request = url2request('https://bar.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://foo/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
