'use strict'
import { expect } from 'chai'
import { after, before, beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import isMv3TestingEnabled from '../../helpers/is-mv3-testing-enabled.js'

const url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

describe('modifyRequest processing of DNSLinks', function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    if (isMv3TestingEnabled) {
      return this.skip()
    }
    global.URL = URL
    global.browser = browser
    browser.runtime.id = 'testid'
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
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('a request to FQDN with dnslinkPolicy=false', function () {
    let activeGateway
    beforeEach(function () {
      // Ensure the eager dnslinkPolicy is on (dns txt lookup for every request)
      state.dnslinkPolicy = false
      // API is online and has one peer
      state.peerCount = 1
      activeGateway = state.gwURLString
      // clear dnslink cache to ensure DNS TXT record lookup is triggered
      dnslinkResolver.clearCache()
    })
    it('should do nothing if DNS TXT record exists', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      // onHeadersReceived should not change anything
      expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
    })
    it('should do nothing if dnslink for FQDN is in cache', async function () {
      // stub existence of a positive DNSLink cache hit
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      // onHeadersReceived should not change anything
      expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
    })
    it('should do nothing if DNS TXT record exists and dnslink is in cache', async function () {
      // stub existence of a valid DNS record and cache
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      // onHeadersReceived should not change anything
      expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
    })
    it('should do nothing if DNS TXT record exists and x-ipfs-path is disabled', async function () {
      // enable detection of x-ipfs-path to ensure it is not enough without dnslinkPolicy=detectIpfsPathHeader
      state.detectIpfsPathHeader = false
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipns/this-should-be-ignored.io')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/value-from-x-ipfs-path.io' }]
      // onHeadersReceived should not change anything
      expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
    })
    it('should ignore DNS TXT record and use /ipfs/ path from x-ipfs-path if both are present', async function () {
      // enable detection of x-ipfs-path to ensure it is not enough without dnslinkPolicy=detectIpfsPathHeader
      state.detectIpfsPathHeader = true
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipns/this-should-be-ignored.io')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
      // onHeadersReceived should redirect to value from X-Ipfs-Path
      expect((await modifyRequest.onHeadersReceived(request)).redirectUrl).to.equal(activeGateway + '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd?argTest#hashTest')
    })
    it('should ignore DNS TXT record and also ignore /ipns/ path from x-ipfs-path if both are present', async function () {
      // enable detection of x-ipfs-path to ensure it is not enough without dnslinkPolicy=detectIpfsPathHeader
      state.detectIpfsPathHeader = true
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipns/this-should-be-ignored.io')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/value-from-x-ipfs-path-to-ignore.io' }]
      // onHeadersReceived should ignore /ipns/ from x-ipfs-path because dnslink is disabled in preferences
      // and redirect would confuse users
      expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
    })
  })

  describe('a request to FQDN with dnslinkPolicy=enabled', function () {
    let activeGateway
    beforeEach(function () {
      // Ensure the eager dnslinkPolicy is on (dns txt lookup for every request)
      state.dnslinkPolicy = 'enabled'
      // disable detection of x-ipfs-path to ensure isolated test
      // TODO: create separate 'describe' section  for detectIpfsPathHeader==true
      state.detectIpfsPathHeader = false
      // API is online and has one peer
      state.peerCount = 1
      activeGateway = state.gwURLString
      // clear dnslink cache to ensure DNS TXT record lookup is triggered
      dnslinkResolver.clearCache()
    })
    it('should redirect in onBeforeRequest if dnslink exists', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
    })
    it('should redirect in onBeforeRequest if DNS TXT record exists, XHR is cross-origin and runtime is Chromium', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      runtime.isFirefox = false
      // Chrome uses 'initiator' for origin
      const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      expect((await modifyRequest.onBeforeRequest(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
    })
    it('should redirect in onBeforeRequest if dnslink exists, XHR is cross-origin and runtime is Firefox', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      runtime.isFirefox = true
      // Firefox uses 'originUrl' for origin
      const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      expect((await modifyRequest.onBeforeRequest(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
    })
    it('should redirect later in onHeadersReceived if dnslink exists, XHR is cross-origin and runtime is Firefox <69', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      // Context for CORS XHR problems in Firefox <69: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      runtime.requiresXHRCORSfix = true
      // Firefox uses 'originUrl' for origin
      const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
      expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
      // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
      expect((await modifyRequest.onHeadersReceived(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
    })
    it('should do nothing if dnslink does not exist and XHR is cross-origin in Firefox', async function () {
      // stub no dnslink
      const fqdn = 'youtube.com'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(undefined)
      // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
      runtime.isFirefox = true
      // Firefox uses 'originUrl' for origin
      const xhrRequest = { url: 'https://youtube.com/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      // onBeforeRequest should not change anything
      expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
      // onHeadersReceived should not change anything
      expect(await modifyRequest.onHeadersReceived(xhrRequest)).to.equal(undefined)
    })
  })

  describe('a request to FQDN with dnslinkPolicy=detectIpfsPathHeader', function () {
    let activeGateway
    beforeEach(function () {
      // Enable the eager dnslinkPolicy (dns txt lookup for every request)
      state.dnslinkPolicy = 'detectIpfsPathHeader'
      // disable detection of x-ipfs-path to ensure isolated test
      // TODO: create separate 'describe' section  for detectIpfsPathHeader==true
      state.detectIpfsPathHeader = true
      // API is online and has one peer
      state.peerCount = 1
      activeGateway = state.gwURLString
    })
    describe('and dnslink cache miss', function () {
      beforeEach(function () {
        // force-clear dnslink cache to enable cache miss
        dnslinkResolver.clearCache()
      })
      it('should redirect subrequests in onHeadersReceived if DNS TXT record exists and x-ipfs-path header is present', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub existence of a valid DNS record
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        request.type = 'sub_frame' // we test a subrequests because main_frame gets early DNSLink preload in onBeforeRequest
        expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        // DNSLink is present, so we ignore hash from X-Ipfs-Path header and redirect to nice /ipns/ address
        expect((await modifyRequest.onHeadersReceived(request)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
      })
      it('should redirect in onHeadersReceived if DNS TXT record is missing but x-ipfs-path header is present', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub lack of DNS record
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(false)
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        request.type = 'sub_frame' // we test a subrequest here because main_frame gets early DNSLink preload in onBeforeRequest
        expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        // Note that DNSLink is missing, so a path from x-ipfs-path is used
        expect((await modifyRequest.onHeadersReceived(request)).redirectUrl).to.equal(activeGateway + '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd?argTest#hashTest')
      })
      it('should do nothing if DNS TXT record exists but there is no x-ipfs-path header', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub existence of a valid DNS record
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        request.type = 'sub_frame' // we test a subrequest here because main_frame gets early DNSLink preload in onBeforeRequest
        expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
        expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
      })
      describe('(XHR CORS scenario)', function () {
        // Test makes more sense for dnslinkPolicy=enabled, but we keep it here for completeness
        it('should redirect in onHeadersReceived if XHR is cross-origin and runtime is not Firefox', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          runtime.isFirefox = false
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          xhrRequest.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
          expect((await modifyRequest.onHeadersReceived(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
        })
        // Test makes more sense for dnslinkPolicy=enabled, but we keep it here for completeness
        it('should redirect in onHeadersReceived if XHR is cross-origin and runtime is Firefox', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
          expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
          xhrRequest.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
          expect((await modifyRequest.onHeadersReceived(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
        })
        it('should redirect later in onHeadersReceived if XHR is cross-origin and runtime is Firefox <69', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          // Context for CORS XHR problems in Firefox <69: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.requiresXHRCORSfix = true
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
          expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
          expect((await modifyRequest.onHeadersReceived(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
        })
        // Test makes more sense for dnslinkPolicy=enabled, but we keep it here for completeness
        it('should do nothing if DNS TXT record is missing and XHR is cross-origin in Firefox', async function () {
          // stub no dnslink
          const fqdn = 'youtube.com'
          dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(false)
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = { url: 'https://youtube.com/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          // onBeforeRequest should not change anything
          expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived should not change anything
          expect(await modifyRequest.onHeadersReceived(xhrRequest)).to.equal(undefined)
        })
      })
    })
    describe('and dnslink cache hit', function () {
      it('should redirect in onBeforeRequest', async function () {
        // stub existence of a valid DNS record
        const fqdn = 'explore.ipld.io'
        // manually add item to cache to ensure cache hit
        dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
      })
      describe('(XHR CORS scenario)', function () {
        it('should redirect in onBeforeRequest if XHR is cross-origin and runtime is not Firefox', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          runtime.isFirefox = false
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          expect((await modifyRequest.onBeforeRequest(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
        })
        it('should redirect in onBeforeRequest if XHR is cross-origin and runtime is Firefox', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          expect((await modifyRequest.onBeforeRequest(xhrRequest)).redirectUrl).to.equal(activeGateway + '/ipns/explore.ipld.io/index.html?argTest#hashTest')
        })
        it('should do nothing if DNS TXT record is missing and XHR is cross-origin in Firefox', async function () {
          // stub cached info about lack of dnslink
          const fqdn = 'youtube.com'
          dnslinkResolver.setDnslink(fqdn, false)
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = { url: 'https://youtube.com/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          // onBeforeRequest should not change anything
          expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)
          // onHeadersReceived should not change anything
          expect(await modifyRequest.onHeadersReceived(xhrRequest)).to.equal(undefined)
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
