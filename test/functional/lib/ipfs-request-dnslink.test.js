'use strict'
import { afterAll as after, afterEach, beforeAll as before, beforeEach, describe, it } from 'vitest'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import { cleanupRules } from '../../../add-on/src/lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import isManifestV3 from '../../helpers/is-mv3-testing-enabled.js'
import { ensureCallRedirected, ensureNoRedirect, ensureRequestUntouched } from '../../helpers/mv3-test-helper.js'

const url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

describe('modifyRequest processing of DNSLinks', function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
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

  afterEach(async function () {
    if (isManifestV3) {
      await cleanupRules(true)
    }
  })

  describe('a request to FQDN with dnslinkPolicy=false', function () {
    beforeEach(function () {
      // Ensure the eager dnslinkPolicy is on (dns txt lookup for every request)
      state.dnslinkPolicy = false
      // API is online and has one peer
      state.peerCount = 1
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
      // onHeadersReceived should not change anything
      await ensureNoRedirect(modifyRequest, request)
    })
    it('should do nothing if dnslink for FQDN is in cache', async function () {
      // stub existence of a positive DNSLink cache hit
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      // onHeadersReceived should not change anything
      await ensureNoRedirect(modifyRequest, request)
    })
    it('should do nothing if DNS TXT record exists and dnslink is in cache', async function () {
      // stub existence of a valid DNS record and cache
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      // onHeadersReceived should not change anything
      await ensureNoRedirect(modifyRequest, request)
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
      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/value-from-x-ipfs-path.io' }]
      // onHeadersReceived should not change anything
      ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
    })
    it('should ignore /ipfs/ path from x-ipfs-path when DNSLink cannot be confirmed', async function () {
      // enable detection of x-ipfs-path to ensure it is not enough without dnslinkPolicy=detectIpfsPathHeader
      state.detectIpfsPathHeader = true
      // stub existence of a valid DNS record (irrelevant, dnslinkPolicy=false disables lookups)
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipns/this-should-be-ignored.io')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything
      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
      // onHeadersReceived should not redirect: without a DNSLink lookup we can't
      // tell a misconfigured website from an IPFS-hosted one, and redirect to an
      // immutable snapshot would strand the user on a stale copy
      // https://github.com/ipfs/ipfs-companion/issues/1052
      ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
    })
    it('should redirect to /ipns/ address if DNSLink for FQDN is in cache', async function () {
      // enable detection of x-ipfs-path
      state.detectIpfsPathHeader = true
      // DNSLink in cache from before dnslinkPolicy was disabled:
      // when DNSLink is known to be valid the user gets the mutable /ipns/
      // address built from the domain name, never the immutable /ipfs/
      // snapshot from the header
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.setDnslink(fqdn, '/ipns/this-should-be-ignored.io')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // onBeforeRequest should not change anything (dnslinkPolicy=false)
      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
      // onHeadersReceived should redirect to /ipns/ address of the website
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onHeadersReceived(request),
        MV2Expectation: `${state.gwURLString}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
          destination: `${state.gwURLString}/ipns/explore.ipld.io\\1`
        }
      })
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
      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/value-from-x-ipfs-path-to-ignore.io' }]
      // onHeadersReceived should ignore /ipns/ from x-ipfs-path because dnslink is disabled in preferences
      // and redirect would confuse users
      ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
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
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
          destination: `${activeGateway}/ipns/explore.ipld.io\\1`
        }
      })
    })
    it('should redirect in onBeforeRequest if DNS TXT record exists, XHR is cross-origin and runtime is Chromium', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      runtime.isFirefox = false
      // Chrome uses 'initiator' for origin
      const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
        MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
          destination: `${activeGateway}/ipns/explore.ipld.io\\1`
        }
      })
    })
    it('should redirect in onBeforeRequest if dnslink exists, XHR is cross-origin and runtime is Firefox', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      runtime.isFirefox = true
      // Firefox uses 'originUrl' for origin
      const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
        MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
          destination: `${activeGateway}/ipns/explore.ipld.io\\1`
        }
      })
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
      ensureRequestUntouched(await modifyRequest.onBeforeRequest(xhrRequest))
      // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onHeadersReceived(xhrRequest),
        MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
          destination: `${activeGateway}/ipns/explore.ipld.io\\1`
        }
      })
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
      // onHeadersReceived should not change anything
      await ensureNoRedirect(modifyRequest, xhrRequest)
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
        ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        // DNSLink is present, so we ignore hash from X-Ipfs-Path header and redirect to nice /ipns/ address
        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onHeadersReceived(request),
          MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
          MV3Expectation: {
            origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
            destination: `${activeGateway}/ipns/explore.ipld.io\\1`
          }
        })
      })
      it('should NOT redirect subrequest in onHeadersReceived if DNS TXT record is missing but x-ipfs-path header is present', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub lack of DNS record
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(false)
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        request.type = 'sub_frame' // we test a subrequest here because main_frame gets early DNSLink preload in onBeforeRequest
        ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        // DNSLink is missing, so the website is misconfigured and immutable
        // /ipfs/ from x-ipfs-path is ignored: in MV3 even a subresource
        // redirect creates a host-wide rule that would strand future
        // main_frame navigation on a stale snapshot
        // https://github.com/ipfs/ipfs-companion/issues/1052
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should NOT redirect main_frame in onHeadersReceived if DNS TXT record is missing but x-ipfs-path header is present', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub lack of DNS record (how fleek.co was set up when issue 1052 was filed)
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(false)
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        // no DNSLink means redirect would replace the live website in the
        // address bar with an immutable snapshot the user cannot bookmark or
        // refresh to get updates
        // https://github.com/ipfs/ipfs-companion/issues/1052
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should NOT redirect in onHeadersReceived if DNSLink lookup is unavailable (offline)', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // when offline readDnslinkFromTxtRecord returns undefined:
        // without cache we cannot confirm DNSLink, so no redirect
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(undefined)
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should NOT redirect in onHeadersReceived if DNS TXT record is missing and URL only pretends to be a gateway URL', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub lack of DNS record
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)
        // path starts with /ipns/ but 'article' is not a CID nor a FQDN:
        // the URL-shaped skip ignores the header, and URL-based handling in
        // onBeforeRequest rejects the invalid /ipns/ root, so nothing
        // redirects this regular website page to the value from the header
        const request = url2request('http://explore.ipld.io/ipns/article/?argTest#hashTest')
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should ignore x-ipfs-path in onHeadersReceived if request URL is a subdomain gateway URL', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub lack of DNS record
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)
        // same as for path gateways: content path comes from the URL alone,
        // a header from the gateway cannot override it
        const cid = 'bafybeidwgtlx54aifd5ynwwvlozr2fuw5xrmbu3ivnwmnoxi4ewdnxty5y'
        const spoofedCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
        const request = url2request(`https://${cid}.ipfs.cf-ipfs.com/index.html?argTest#hashTest`)
        // simulate a malicious gateway pointing at different content
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${spoofedCid}/index.html` }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should ignore x-ipfs-path on a gateway URL even when a DNSLink is cached for the gateway host', async function () {
        // pins the URL-shaped skip: a gateway hostname can carry a DNSLink of
        // its own, and without the skip that cached record would trigger a
        // redirect off a gateway URL whose content path already comes from
        // the URL alone
        dnslinkResolver.clearCache()
        const cid = 'bafybeidwgtlx54aifd5ynwwvlozr2fuw5xrmbu3ivnwmnoxi4ewdnxty5y'
        dnslinkResolver.setDnslink(`${cid}.ipfs.cf-ipfs.com`, '/ipns/unrelated.example')
        const request = url2request(`https://${cid}.ipfs.cf-ipfs.com/index.html?argTest#hashTest`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${cid}/index.html` }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should ignore x-ipfs-path in onHeadersReceived if request URL is a path gateway URL', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // stub lack of DNS record
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)
        // gateways can put anything in response headers, but not in the URL
        // the user navigated to: for gateway URLs the content path comes
        // from the URL alone (onBeforeRequest), never from x-ipfs-path
        const cid = 'QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd'
        const spoofedCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
        const request = url2request(`http://example.com/ipfs/${cid}/index.html?argTest#hashTest`)
        // simulate a malicious gateway pointing at different content
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${spoofedCid}/index.html` }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('should NOT redirect in onHeadersReceived if DNS TXT record exists but dnslinkRedirect is disabled', async function () {
        // clear dnslink cache to ensure miss
        dnslinkResolver.clearCache()
        // user opted out of DNSLink redirects: no /ipns/ redirect happens,
        // and the immutable /ipfs/ snapshot from the header is never used
        // as a fallback (it would strand the user on a stale copy)
        state.dnslinkRedirect = false
        // stub existence of a valid DNS record
        const fqdn = 'explore.ipld.io'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipns/this-should-be-ignored.io')
        //
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        // simulate presence of x-ipfs-path header returned by HTTP gateway
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
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
        await ensureNoRedirect(modifyRequest, request)
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
          ensureRequestUntouched(await modifyRequest.onBeforeRequest(xhrRequest))
          xhrRequest.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onHeadersReceived(xhrRequest),
            MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
            MV3Expectation: {
              origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
              destination: `${activeGateway}/ipns/explore.ipld.io\\1`
            }
          })
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
          ensureRequestUntouched(await modifyRequest.onBeforeRequest(xhrRequest))
          // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
          xhrRequest.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onHeadersReceived(xhrRequest),
            MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
            MV3Expectation: {
              origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
              destination: `${activeGateway}/ipns/explore.ipld.io\\1`
            }
          })
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
          ensureRequestUntouched(await modifyRequest.onBeforeRequest(xhrRequest))
          // onHeadersReceived is after CORS validation happens, so its ok to cancel and redirect late
          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onHeadersReceived(xhrRequest),
            MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
            MV3Expectation: {
              origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
              destination: `${activeGateway}/ipns/explore.ipld.io\\1`
            }
          })
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
          // onHeadersReceived should not change anything
          await ensureNoRedirect(modifyRequest, xhrRequest)
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
        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
          MV3Expectation: {
            origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
            destination: `${activeGateway}/ipns/explore.ipld.io\\1`
          }
        })
      })
      describe('(XHR CORS scenario)', function () {
        it('should redirect in onBeforeRequest if XHR is cross-origin and runtime is not Firefox', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          runtime.isFirefox = false
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
            MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
            MV3Expectation: {
              origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
              destination: `${activeGateway}/ipns/explore.ipld.io\\1`
            }
          })
        })
        it('should redirect in onBeforeRequest if XHR is cross-origin and runtime is Firefox', async function () {
          // stub existence of a valid DNS record
          const fqdn = 'explore.ipld.io'
          dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
          //
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = { url: 'http://explore.ipld.io/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
            MV2Expectation: `${activeGateway}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
            MV3Expectation: {
              origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
              destination: `${activeGateway}/ipns/explore.ipld.io\\1`
            }
          })
        })
        it('should do nothing if DNS TXT record is missing and XHR is cross-origin in Firefox', async function () {
          // stub cached info about lack of dnslink
          const fqdn = 'youtube.com'
          dnslinkResolver.setDnslink(fqdn, false)
          // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
          runtime.isFirefox = true
          const xhrRequest = { url: 'https://youtube.com/index.html?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
          // onBeforeRequest should not change anything
          // onHeadersReceived should not change anything
          await ensureNoRedirect(modifyRequest, xhrRequest)
        })
      })
    })
  })

  describe('a request to FQDN with dnslinkPolicy=best-effort (shipped default)', function () {
    beforeEach(function () {
      state.dnslinkPolicy = 'best-effort'
      state.detectIpfsPathHeader = true
      // API is online and has one peer
      state.peerCount = 1
      // clear dnslink cache to ensure DNS TXT record lookup is triggered
      dnslinkResolver.clearCache()
    })
    it('should NOT redirect in onHeadersReceived if DNS TXT record is missing but x-ipfs-path header is present', async function () {
      // the misconfiguration from issue 1052 under default settings:
      // back when the issue was filed, https://fleek.co returned x-ipfs-path
      // with an immutable /ipfs/ snapshot but had no _dnslink DNS TXT record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves(false)
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
      ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
    })
    it('should redirect to /ipns/ in onHeadersReceived if DNS TXT record exists and x-ipfs-path header is present', async function () {
      // positive control for the test above: proves x-ipfs-path processing
      // is not dead under the default policy
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      // simulate presence of x-ipfs-path header returned by HTTP gateway
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
      // DNSLink is present, so we ignore hash from X-Ipfs-Path header and redirect to nice /ipns/ address
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onHeadersReceived(request),
        MV2Expectation: `${state.gwURLString}/ipns/explore.ipld.io/index.html?argTest#hashTest`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/explore\\.ipld\\.io',
          destination: `${state.gwURLString}/ipns/explore.ipld.io\\1`
        }
      })
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
