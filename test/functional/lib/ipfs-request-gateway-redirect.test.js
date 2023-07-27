'use strict'
import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import { URL } from 'url'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier, redirectOptOutHint } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import { cleanupRules } from '../../../add-on/src/lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import isManifestV3, { manifestVersion } from '../../helpers/is-mv3-testing-enabled.js'
import { ensureCallRedirected, ensureRequestUntouched, expectNoRedirect } from '../../helpers/mv3-test-helper.js'

const url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

const nodeTypes = ['external']

describe(`[${manifestVersion}] modifyRequest.onBeforeRequest:`, function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

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

  afterEach(async function () {
    if (isManifestV3) {
      await cleanupRules(true)
    }
  })

  describe('request for a path matching /ipfs/{CIDv0}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if redirect is enabled', async function () {
        const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: 'http://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://localhost:8080'
          }
        })
      })
    })
    describe('with every node type', function () {
      // tests in which results should be the same for all node types
      nodeTypes.forEach(function (nodeType) {
        beforeEach(function () {
          state.ipfsNodeType = nodeType
        })
        it(`should be left untouched if redirect is disabled (${nodeType} node)`, async function () {
          state.redirect = false
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')

          await expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if redirect is enabled but global active flag is OFF (${nodeType} node)`, async function () {
          state.active = false
          state.redirect = true
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')

          await expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if URL includes opt-out hint (${nodeType} node)`, async function () {
          // A safe way for preloading data at arbitrary gateways - it should arrive at original destination
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect#hashTest')

          await expectNoRedirect(modifyRequest, request)
          expect(redirectOptOutHint).to.equal('x-ipfs-companion-no-redirect')
        })
        it(`should be left untouched if request is for subresource on a page loaded from URL that includes opt-out hint (${nodeType} node)`, async function () {
          // ensure opt-out works for subresources (Firefox only for now)
          const subRequest = {
            type: 'script',
            url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            originUrl: 'https://example.com/?x-ipfs-companion-no-redirect#hashTest'
          }

          await expectNoRedirect(modifyRequest, subRequest)
        })
        it(`should be left untouched if CID is invalid (${nodeType} node)`, async function () {
          const request = url2request('https://google.com/ipfs/notacid?argTest#hashTest')

          await expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if its is a HEAD preload with explicit opt-out in URL hash (${nodeType} node)`, async function () {
          // HTTP HEAD is a popular way for preloading data at arbitrary gateways, so we have a dedicated test to make sure it works as expected
          const headRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#x-ipfs-companion-no-redirect', method: 'HEAD' }

          await expectNoRedirect(modifyRequest, headRequest)
        })
      })
    })
  })

  describe('XHR request for a path matching /ipfs/{CIDv0} coming from 3rd party Origin', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Firefox', async function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/' }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Chromium', async function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/' }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in Chromium', async function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in Firefox', async function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
    })
    describe('with external node when runtime.requiresXHRCORSfix', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
        browser.runtime.getBrowserInfo = () => Promise.resolve({ name: 'Firefox', version: '68.0.0' })
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Firefox', async function () {
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://google.com/' }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in non-Firefox', async function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/' }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
      it('should be served from custom gateway if XHR is cross-origin and redirect is enabled in non-Firefox', async function () {
        runtime.isFirefox = false
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
      it('should be served from custom gateway via late redirect in onHeadersReceived if XHR is cross-origin and redirect is enabled in Firefox', async function () {
        // Context for CORS XHR problems in Firefox: https://github.com/ipfs-shipyard/ipfs-companion/issues/436
        runtime.isFirefox = true
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', originUrl: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }

        // onBeforeRequest should not change anything, as it will trigger false-positive CORS error
        expect(await modifyRequest.onBeforeRequest(xhrRequest)).to.equal(undefined)

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onHeadersReceived(xhrRequest),
          MV2Expectation: 'http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://127.0.0.1:8080'
          }
        })
      })
    })
  })

  describe('request for a path matching /ipns/{path}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if {path} points to a FQDN with existing dnslink', async function () {
        const request = url2request('https://google.com/ipns/en.wikipedia-on-ipfs.org/index.html?argTest#hashTest')
        // stub the existence of valid dnslink
        const fqdn = 'en.wikipedia-on-ipfs.org'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
        // pretend API is online and we can do dns lookups with it
        state.peerCount = 1

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org/index.html?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://localhost:8080'
          }
        })
      })
      it('should be served from custom gateway if {path} starts with a valid PeerID', async function () {
        const request = url2request('https://google.com/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: 'http://localhost:8080/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/google\\.com',
            destination: 'http://localhost:8080'
          }
        })
      })
    })

    describe('with every node type', function () {
      // tests in which results should be the same for all node types
      nodeTypes.forEach(function (nodeType) {
        beforeEach(function () {
          state.ipfsNodeType = nodeType
        })
        it(`should be left untouched if redirect is disabled' (${nodeType} node)`, async function () {
          state.redirect = false
          const request = url2request('https://google.com/ipns/ipfs.io?argTest#hashTest')

          await expectNoRedirect(modifyRequest, request)
        })
        it(`should be left untouched if FQDN is not a real domain nor a valid CID (${nodeType} node)`, async function () {
          const request = url2request('https://google.com/ipns/notafqdnorcid?argTest#hashTest')
          dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)

          await expectNoRedirect(modifyRequest, request)
        })
      })
    })
  })

  describe('request to a subdomain gateway', function () {
    const cid = 'bafybeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge'
    const peerid = 'bafzbeigxjv2o4jse2lajbd5c7xxl5rluhyqg5yupln42252e5tcao7hbge'

    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
        // dweb.link is the default subdomain gw
      })

      it('should be redirected to localhost gateway (*.ipfs on default gw)', async function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.dweb.link/`)

        // We expect redirect to path-based gateway because go-ipfs >=0.5 will
        // return redirect to a subdomain, and we don't want to break users
        // running older versions of go-ipfs by loading subdomain first and
        // failing.
        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: `http://localhost:8080/ipfs/${cid}/`,
          MV3Expectation: {
            origin: `^https?\\:\\/\\/${cid}\\.ipfs\\.dweb\\.link`,
            destination: `http://localhost:8080/ipfs/${cid}`
          }
        })
      })
      it('should be redirected to localhost gateway (*.ipfs on 3rd party gw)', async function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.cf-ipfs.com/`)

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: `http://localhost:8080/ipfs/${cid}/`,
          MV3Expectation: {
            origin: `^https?\\:\\/\\/${cid}\\.ipfs\\.cf\\-ipfs\\.com`,
            destination: `http://localhost:8080/ipfs/${cid}`
          }
        })
      })
      it('should be redirected to localhost gateway and keep URL encoding of original path', async function () {
        state.redirect = true
        const request = url2request('https://bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy.ipfs.dweb.link/%3Ffilename=test.jpg?arg=val')

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: 'http://localhost:8080/ipfs/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy/%3Ffilename=test.jpg?arg=val',
          MV3Expectation: {
            origin: '^https?\\:\\/\\/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy\\.ipfs\\.dweb\\.link',
            destination: 'http://localhost:8080/ipfs/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy'
          }
        })
      })
      it('should be redirected to localhost gateway (*.ipns on default gw)', async function () {
        state.redirect = true
        const request = url2request(`https://${peerid}.ipns.dweb.link/`)

        ensureCallRedirected({
          modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
          MV2Expectation: `http://localhost:8080/ipns/${peerid}/`,
          MV3Expectation: {
            origin: `^https?\\:\\/\\/${peerid}\\.ipns\\.dweb\\.link`,
            destination: `http://localhost:8080/ipns/${peerid}`
          }
        })
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
        it('should fix localhost Kubo RPC hostname to IP', async function () {
          const request = url2request('http://localhost:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')

          if (!isManifestV3) {
            // this is set as a default rule in MV3
            expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
              .to.equal('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          }
        })
        it('should be left untouched if localhost Gateway is used', async function () {
          const request = url2request('http://localhost:8080/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')

          await expectNoRedirect(modifyRequest, request)
        })
        it('should fix 127.0.0.1 Gateway to localhost', async function () {
          const request = url2request('http://127.0.0.1:8080/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')

          if (!isManifestV3) {
            // this is set as a default rule in MV3.
            expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
              .to.equal('http://localhost:8080/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          }
        })
        it('should fix 0.0.0.0 to localhost IP API', async function () {
          // https://github.com/ipfs-shipyard/ipfs-companion/issues/867
          const request = url2request('http://0.0.0.0:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')

          ensureCallRedirected({
            modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
            MV2Expectation: 'http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/',
            MV3Expectation: {
              origin: '^https?\\:\\/\\/0\\.0\\.0\\.0',
              destination: 'http://127.0.0.1'
            }
          })
        })
        it('should be left untouched if /webui on localhost Kubo RPC port', async function () {
          // https://github.com/ipfs/ipfs-companion/issues/291
          const request = url2request('http://localhost:5001/webui')

          if (isManifestV3) {
            sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
          } else {
            expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
              .to.equal('http://127.0.0.1:5001/webui')
          }
        })
        it('should be left untouched if localhost Kubo RPC IP is used, even when x-ipfs-path is present', async function () {
          // https://github.com/ipfs-shipyard/ipfs-companion/issues/604
          const request = url2request('http://127.0.0.1:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')
          request.responseHeaders = [{ name: 'X-Ipfs-Path', value: '/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DDIFF' }]

          await expectNoRedirect(modifyRequest, request)
        })
        it('should be left untouched if [::1] is used', async function () {
          // https://github.com/ipfs/ipfs-companion/issues/291
          const request = url2request('http://[::1]:5001/ipfs/QmPhnvn747LqwPYMJmQVorMaGbMSgA7mRRoyyZYz3DoZRQ/')

          await expectNoRedirect(modifyRequest, request)
        })
        it('should be redirected to localhost (subdomain in go-ipfs >0.5) if type=main_frame and  127.0.0.1 (path gw) is used un URL', async function () {
          state.redirect = true
          state.useSubdomains = true
          expect(state.gwURL.hostname).to.equal('localhost')
          const cid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
          const request = url2request(`http://127.0.0.1:8080/ipfs/${cid}?arg=val#hash`)
          request.type = 'main_frame' // explicit

          if (!isManifestV3) {
            // this is set as a default rule in MV3.
            expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
              .to.equal(`http://localhost:8080/ipfs/${cid}?arg=val#hash`)
          }
        })
      })
    })
  })

  describe('request for IPFS Path with redirect to custom gateway at port 80', function () {
    beforeEach(function () {
      state.ipfsNodeType = 'external'
      state.redirect = true
    })
    it('should work for HTTP GW without explicit port in URL', async function () {
      state.gwURLString = 'http://foo:80/'
      state.gwURL = new URL(state.gwURLString)
      const request = url2request('https://bar.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')

      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: 'http://foo/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
        MV3Expectation: {
          origin: '^https?\\:\\/\\/bar\\.com',
          destination: 'http://foo'
        }
      })
    })
    it('should work for HTTPS GW without explicit port in URL', async function () {
      state.gwURLString = 'https://foo:443/'
      state.gwURL = new URL(state.gwURLString)
      const request = url2request('https://bar.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')

      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: 'https://foo/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
        MV3Expectation: {
          origin: '^https?\\:\\/\\/bar\\.com',
          destination: 'https://foo'
        }
      })
    })
  })

  describe('Recovers Page if node is unreachable', function () {
    beforeEach(function () {
      state.ipfsNodeType = 'external'
      state.redirect = true
      state.peerCount = -1 // this simulates Kubo RPC being offline
      state.gwURLString = 'http://localhost:8080'
      state.gwURL = new URL('http://localhost:8080')
      state.pubGwURLString = 'https://ipfs.io'
      state.pubGwURL = new URL('https://ipfs.io')
    })

    it('should present recovery page if node is offline and redirect is enabled', async function () {
      expect(state.nodeActive).to.be.equal(false)
      const request = url2request('https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')

      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: 'chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2Fbar',
        MV3Expectation: {
          origin: '^https?\\:\\/\\/localhost\\:8080\\/ipfs\\/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR\\/foo\\/',
          destination: 'chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2F'
        }
      })
    })

    it('should present recovery page if node is offline and redirect is disabled', async function () {
      expect(state.nodeActive).to.be.equal(false)
      state.redirect = false
      const request = url2request('https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')

      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: 'chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2Fbar',
        MV3Expectation: {
          origin: '^https?\\:\\/\\/localhost\\:8080\\/ipfs\\/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR\\/foo\\/',
          destination: 'chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2F'
        }
      })
    })

    it('should not show recovery page if node is offline, redirect is enabled, but non-gateway URL failed to load from the same port', async function () {
      // this covers https://github.com/ipfs/ipfs-companion/issues/1162 and https://twitter.com/unicomp21/status/1626244123102679041
      state.redirect = true
      expect(state.nodeActive).to.be.equal(false)
      const request = url2request('https://localhost:8080/')

      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
    })

    it('should not show recovery page if extension is disabled', async function () {
      // allows user to quickly avoid anything similar to https://github.com/ipfs/ipfs-companion/issues/1162
      state.active = false
      expect(state.nodeActive).to.be.equal(false)
      const request = url2request('https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')

      ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
    })
  })
})
