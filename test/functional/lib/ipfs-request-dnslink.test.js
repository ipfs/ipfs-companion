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
      redirectSubresources: true, // several cases here redirect XHR/sub_frame; off-by-default is covered in ipfs-request-subresources.test.js
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

  describe('a request with DNSLink detection off (dnslinkLookup=false)', function () {
    beforeEach(function () {
      // DNSLink detection off: no lookups, no redirect
      state.dnslinkLookup = false
      // API is online and has one peer
      state.peerCount = 1
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
  })

  describe('a request to a DNSLink FQDN already in cache', function () {
    let activeGateway
    beforeEach(function () {
      // DNSLink detection on; each test seeds a known record so onBeforeRequest
      // redirects from cache (no blocking lookup happens anymore)
      state.dnslinkLookup = true
      // API is online and has one peer
      state.peerCount = 1
      activeGateway = state.gwURLString
      dnslinkResolver.clearCache()
    })
    it('should redirect in onBeforeRequest if dnslink exists', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
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
    it('should redirect in onBeforeRequest if DNS TXT record exists, XHR is cross-origin and runtime is Chromium', async function () {
      // stub existence of a valid DNS record
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
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
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
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
      dnslinkResolver.setDnslink(fqdn, '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
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

  describe('a request to a DNSLink FQDN not yet in cache (best-effort default)', function () {
    beforeEach(function () {
      state.dnslinkLookup = true
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
    it('should NOT redirect from onHeadersReceived when DNSLink exists; the upgrade is the late redirect', async function () {
      // under the default policy the DNSLink first-load upgrade no longer runs
      // in onHeadersReceived and does not use the x-ipfs-path header: it happens
      // in onBeforeRequest once the background lookup resolves, covered in
      // ipfs-request-late-dnslink-redirect.test.js
      const fqdn = 'explore.ipld.io'
      dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd')
      //
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd' }]
      ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
    })
  })

  describe('x-ipfs-path header with redirectToXIpfsPathValue (legacy opt-in)', function () {
    const cid = 'QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd'
    beforeEach(function () {
      // this legacy path is independent of DNSLink; isolate it
      state.dnslinkLookup = false
      state.peerCount = 1
      dnslinkResolver.clearCache()
    })
    it('is off by default: ignores the header even with an /ipfs/ value', async function () {
      const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
      request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${cid}` }]
      ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
    })
    describe('when enabled', function () {
      beforeEach(function () {
        state.redirectToXIpfsPathValue = true
      })
      it('redirects to the /ipfs/ path carried by the header', async function () {
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${cid}` }]
        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onHeadersReceived(request),
          MV2Expectation: `${state.gwURLString}/ipfs/${cid}?argTest#hashTest`,
          MV3Expectation: {
            origin: '^https?\\:\\/\\/explore\\.ipld\\.io\\/index\\.html',
            destination: `${state.gwURLString}/ipfs/${cid}\\1`
          }
        })
      })
      it('ignores an /ipns/ header value (only immutable /ipfs/ snapshots)', async function () {
        const request = url2request('http://explore.ipld.io/index.html?argTest#hashTest')
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipns/should-be-ignored.example' }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('ignores the header on a path gateway URL, so a spoofed value cannot win', async function () {
        const spoofed = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
        const request = url2request(`http://example.com/ipfs/${cid}/index.html?argTest#hashTest`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${spoofed}/index.html` }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
      it('ignores the header on a subdomain gateway URL', async function () {
        const subCid = 'bafybeidwgtlx54aifd5ynwwvlozr2fuw5xrmbu3ivnwmnoxi4ewdnxty5y'
        const spoofed = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
        const request = url2request(`https://${subCid}.ipfs.cf-ipfs.com/index.html?argTest#hashTest`)
        request.responseHeaders = [{ name: 'X-Ipfs-Path', value: `/ipfs/${spoofed}/index.html` }]
        ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
      })
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
