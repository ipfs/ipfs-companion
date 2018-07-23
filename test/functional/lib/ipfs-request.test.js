'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const sinon = require('sinon')
const { expect } = require('chai')
const { URL } = require('url')
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const createRuntimeChecks = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier, redirectOptOutHint } = require('../../../add-on/src/lib/ipfs-request')
const createDnsLink = require('../../../add-on/src/lib/dns-link')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

const url2request = (string) => {
  return {url: string, type: 'main_frame'}
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

const nodeTypes = ['external', 'embedded']

describe('modifyRequest.onBeforeRequest', function () {
  let state, dnsLink, ipfsPathValidator, modifyRequest, runtime

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
    dnsLink = createDnsLink(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, dnsLink)
    modifyRequest = createRequestModifier(getState, dnsLink, ipfsPathValidator, runtime)
  })

  describe('request for a path matching /ipfs/{CIDv0}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if redirect is enabled', function () {
        const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
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
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it(`should be left untouched if redirect is enabled but global active flag is OFF (${nodeType} node)`, function () {
          state.active = false
          state.redirect = true
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it(`should be left untouched if URL includes opt-out hint (${nodeType} node)`, function () {
          // A safe way for preloading data at arbitrary gateways - it should arrive at original destination
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect#hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
          expect(redirectOptOutHint).to.equal('x-ipfs-companion-no-redirect')
        })
        it(`should be left untouched if CID is invalid (${nodeType} node)`, function () {
          const request = url2request('https://google.com/ipfs/notacid?argTest#hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it(`should be left untouched if its is a HEAD preload with explicit opt-out in URL hash (${nodeType} node)`, function () {
          // HTTP HEAD is a popular way for preloading data at arbitrary gateways, so we have a dedicated test to make sure it works as expected
          const headRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#x-ipfs-companion-no-redirect', method: 'HEAD'}
          expect(modifyRequest.onBeforeRequest(headRequest)).to.equal(undefined)
        })
      })
    })
  })

  describe('XHR request for a path matching /ipfs/{CIDv0}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/'}
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in non-Firefox', function () {
        runtime.isFirefox = false
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/'}
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in non-Firefox', function () {
        runtime.isFirefox = false
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from custom gateway via late redirect if XHR is cross-origin and redirect is enabled in Firefox', function () {
        // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
        runtime.isFirefox = true
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
        // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
        expect(modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
        // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
        expect(modifyRequest.onHeadersReceived(xhrRequest).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
    })
    describe('with embedded node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'embedded'
      })
      it('should be served from public gateway if fetched from the same origin and redirect is enabled in Firefox', function () {
        runtime.isFirefox = true
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/'}
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from public gateway if fetched from the same origin and redirect is enabled in non-Firefox', function () {
        runtime.isFirefox = false
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/'}
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from public gateway if XHR is cross-origin and redirect is enabled in non-Firefox', function () {
        runtime.isFirefox = false
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
        expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
      })
      it('should be served from public gateway via late redirect if XHR is cross-origin and redirect is enabled in Firefox', function () {
        // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
        runtime.isFirefox = true
        const xhrRequest = {url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
        // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
        expect(modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
        // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
        expect(modifyRequest.onHeadersReceived(xhrRequest).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
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
        dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
        // pretend API is online and we can do dns lookups with it
        state.peerCount = 1
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://127.0.0.1:8080/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      })
      it('should be served from custom gateway if {path} starts with a valid CID', function () {
        const request = url2request('https://google.com/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        dnsLink.readDnslinkFromTxtRecord = sinon.stub().returns(false)
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('http://127.0.0.1:8080/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
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
        dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
        // pretend API is online and we can do dns lookups with it
        state.peerCount = 1
        expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
      })
      it('should be served from public gateway if {path} starts with a valid CID', function () {
        const request = url2request('https://google.com/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        dnsLink.readDnslinkFromTxtRecord = sinon.stub().returns(false)
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
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it(`should be left untouched if FQDN is not a real domain nor a valid CID (${nodeType} node)`, function () {
          const request = url2request('https://google.com/ipns/notafqdnorcid?argTest#hashTest')
          dnsLink.readDnslinkFromTxtRecord = sinon.stub().returns(false)
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it(`should be left untouched if {path} points to a FQDN but API is offline (${nodeType} node)`, function () {
          const request = url2request('https://google.com/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
          // stub the existence of valid dnslink in dnslink cache
          const fqdn = 'ipfs.git.sexy'
          dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
          // pretend API is offline and we can do dns lookups with it
          state.peerCount = 0
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
      })
    })
  })

  // tests in which results should be the same for all node types
  nodeTypes.forEach(function (nodeType) {
    beforeEach(function () {
      state.ipfsNodeType = nodeType
    })
    describe(`with ${nodeType} node:`, function () {
      describe('request made via redirect-based protocol handler from manifest.json/protocol_handlers', function () {
        // Note: requests done with custom protocol handler are always  normalized to public gateway
        // (if external node is enabled, redirect will happen in next iteration of modifyRequest)
        beforeEach(function () {
          // ..however to make tests easier we disable redirect from public to custom gateway
          // (with this modifyRequest will return undefined for invalid URIs)
          state.redirect = false
        })

        // without web+ prefix (Firefox > 59: https://github.com/ipfs-shipyard/ipfs-companion/issues/164#issuecomment-356301174)
        it('should not be normalized if ipfs:/{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipfs://{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if ipns:/{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#ipns%3A%2Fipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipns://{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#ipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should be normalized if dweb:/ipfs/{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#dweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if dweb://ipfs/{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#dweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if dweb:/ipns/{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#dweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should not be normalized if dweb://ipns/{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#dweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })

        // web+ prefixed versions (Firefox < 59 and Chrome)
        it('should not be normalized if web+ipfs:/{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipfs://{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if web+ipns:/{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bipns%3A%2Fipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipns://{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bipns%3A%2F%2Fipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should be normalized if web+dweb:/ipfs/{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bdweb%3A%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if web+dweb://ipfs/{CID}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bdweb%3A%2F%2Fipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+dweb:/ipns/{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bdweb%3A%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).equal('https://ipfs.io/ipns/ipfs.io?argTest#hashTest')
        })
        it('should not be normalized if web+dweb://ipns/{foo}', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bdweb%3A%2F%2Fipns/ipfs.io%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if web+{foo}:/bar', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bfoo%3A%2Fbar%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if web+{foo}://bar', function () {
          const request = url2request('https://gateway.ipfs.io/ipfs/QmXQY7mKr28B964Uj4ouq3fPgkNLqzaKiajTA7surAiQuD#web%2Bfoo%3A%2F%2Fbar%3FargTest%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
      })

      describe('catching unhandled custom protocol request', function () {
        it('should not be normalized if ipfs:/{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipfs://{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if ipns:/{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=ipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if ipns://{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=ipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
        })
        it('should be normalized if dweb:/ipfs/{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if dweb://ipfs/{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if dweb:/ipns/{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if dweb://ipns/{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=dweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })

        it('should not be normalized if web+ipfs:/{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipfs://{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipfs%3A%2F%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        })
        it('should not be normalized if web+ipns:/{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+ipns://{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bipns%3A%2F%2Fipns.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipns.io/index.html?arg=foo&bar=buzz#hashTest')
        })
        it('should be normalized if web+dweb:/ipfs/{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if web+dweb://ipfs/{CID}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=software')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be normalized if web+dweb:/ipns/{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal('https://ipfs.io/ipns/ipfs.io/index.html?arg=foo&bar=buzz#hash')
        })
        it('should not be normalized if web+dweb://ipns/{foo}', function () {
          const request = url2request('https://duckduckgo.com/?q=web%2Bdweb%3A%2F%2Fipns%2Fipfs.io%2Findex.html%3Farg%3Dfoo%26bar%3Dbuzz%23hash&ia=web')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })

        it('should not be normalized if disabled in Preferences', function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if CID is invalid', function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=ipfs%3A%2FnotARealIpfsPathWithCid%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if presence of %3A%2F is a false-positive', function () {
          state.catchUnhandledProtocols = false
          const request = url2request('https://duckduckgo.com/?q=foo%3A%2Fbar%3FargTest%23hashTest&foo=bar')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should not be normalized if request.type != main_frame', function () {
          const mediaRequest = {url: 'https://duckduckgo.com/?q=ipfs%3A%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%3FargTest%23hashTest&foo=bar', type: 'media'}
          expect(modifyRequest.onBeforeRequest(mediaRequest)).to.equal(undefined)
        })
      })

      describe('request for IPFS path at a localhost', function () {
        // we do not touch local requests, as it may interfere with other nodes running at the same machine
        // or could produce false-positives such as redirection from 127.0.0.1:5001/ipfs/path to 127.0.0.1:8080/ipfs/path
        it('should be left untouched if 127.0.0.1 is used', function () {
          state.redirect = true
          const request = url2request('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be left untouched if localhost is used', function () {
          // https://github.com/ipfs/ipfs-companion/issues/291
          state.redirect = true
          const request = url2request('http://localhost:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be left untouched if [::1] is used', function () {
          // https://github.com/ipfs/ipfs-companion/issues/291
          state.redirect = true
          const request = url2request('http://[::1]:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
      })

      describe('request to FQDN with valid CID in subdomain', function () {
        // we do not touch such requests for now, as HTTP-based local node usually can't provide the same origin-based guarantees
        // we will redirect subdomains to ipfs:// when native handler is available
        it('should be left untouched for IPFS', function () {
          state.redirect = true
          const request = url2request('http://bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge.ipfs.dweb.link/')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
        it('should be left untouched for IPNS', function () {
          state.redirect = true
          const request = url2request('http://bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge.ipns.dweb.link/')
          expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        })
      })

      describe('request to FQDN with dnslink experiment enabled', function () {
        let activeGateway
        beforeEach(function () {
          // pretend API is online and we can do dns lookups with it
          state.dnslink = true
          state.peerCount = 1
          // embedded node (js-ipfs) defaults to public gw
          activeGateway = (state.ipfsNodeType === 'external' ? state.gwURLString : state.pubGwURLString)
        })
        it('should be redirected to active gateway if dnslink exists', function () {
          // stub the existence of valid dnslink
          const fqdn = 'ipfs.git.sexy'
          dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
          //
          const request = url2request('http://ipfs.git.sexy/index.html?argTest#hashTest')
          expect(modifyRequest.onBeforeRequest(request).redirectUrl).to.equal(activeGateway + '/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
        })
        it('should be redirected to active gateway if fetched from the same origin and redirect is enabled in non-Firefox', function () {
          // stub the existence of valid dnslink
          const fqdn = 'ipfs.git.sexy'
          dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
          //
          runtime.isFirefox = false
          const xhrRequest = {url: 'http://ipfs.git.sexy/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
          expect(modifyRequest.onBeforeRequest(xhrRequest).redirectUrl).to.equal(activeGateway + '/ipns/ipfs.git.sexy/index.html?argTest#hashTest')
        })
        it('should be redirected to active gateway via late redirect if dnslink exists and XHR is cross-origin in Firefox', function () {
          // stub the existence of valid dnslink
          const fqdn = 'ipfs.git.sexy'
          dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
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
          dnsLink.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).returns(undefined)
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = {url: 'https://youtube.com/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId()}
          // onBeforeRequest should not change anything
          expect(modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived should not change anything
          expect(modifyRequest.onHeadersReceived(xhrRequest)).to.equal(undefined)
        })
      })
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
