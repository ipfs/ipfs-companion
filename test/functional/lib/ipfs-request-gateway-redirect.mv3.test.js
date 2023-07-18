'use strict'
import { expect } from 'chai'
import { after, before, beforeEach, describe, it } from 'mocha'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import { URL } from 'url'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier, redirectOptOutHint } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import { generateAddRule } from '../../../add-on/src/lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import DeclarativeNetRequestMock from './redirect-handler/declarativeNetRequest.mock.js'

const url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

const fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

const expectNoRedirect = async (modifyRequest, request, browser) => {
  await modifyRequest.onBeforeRequest(request)
  sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
  await modifyRequest.onHeadersReceived(request)
  sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
}

const regexRuleEnding = '((?:[^\\.]|$).*)$'
const nodeTypes = ['external']
const sinonSandbox = sinon.createSandbox()

describe('[MV3] modifyRequest.onBeforeRequest:', function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    global.URL = URL
    browser.declarativeNetRequest = sinonSandbox.spy(new DeclarativeNetRequestMock())
    browser.runtime.id = 'testid'
    browser.runtime.getURL.returns('chrome-extension://testid/')
    global.browser = browser
  })

  beforeEach(async function () {
    state = Object.assign(initState(optionDefaults), {
      ipfsNodeType: 'external',
      peerCount: 1,
      redirect: true,
      dnslinkPolicy: false, // dnslink test suite is in ipfs-request-dnslink.test.js
      catchUnhandledProtocols: true,
      gwURLString: 'http://localhost:8080',
      gwURL: new URL('http://localhost:8080'),
      pubGwURLString: 'https://ipfs.io',
      pubGwURL: new URL('https://ipfs.io'),
      pubSubdomainGwURLString: 'https://dweb.link',
      pubSubdomainGwURL: new URL('https://dweb.link')
    })
    const getState = () => state
    const getIpfs = () => { }
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  afterEach(async function () {
    sinonSandbox.reset()
  })

  describe('request for a path matching /ipfs/{CIDv0}', function () {
    describe('with external node', function () {
      let sinonSandbox
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if redirect is enabled', async function () {
        const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        // MV2
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('http://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        await modifyRequest.onBeforeRequest(request)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `${'^https?\\:\\/\\/google\\.com'}${regexRuleEnding}`,
            'http://localhost:8080\\1'
          )],
          removeRuleIds: []
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
          await expectNoRedirect(modifyRequest, request, browser)
        })
        it(`should be left untouched if redirect is enabled but global active flag is OFF (${nodeType} node)`, async function () {
          state.active = false
          state.redirect = true
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
          await expectNoRedirect(modifyRequest, request, browser)
        })
        it(`should be left untouched if URL includes opt-out hint (${nodeType} node)`, async function () {
          // A safe way for preloading data at arbitrary gateways - it should arrive at original destination
          const request = url2request('https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?x-ipfs-companion-no-redirect#hashTest')
          await expectNoRedirect(modifyRequest, request, browser)
        })
        it(`should be left untouched if request is for subresource on a page loaded from URL that includes opt-out hint (${nodeType} node)`, async function () {
          // ensure opt-out works for subresources (Firefox only for now)
          const subRequest = {
            type: 'script',
            url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest',
            originUrl: 'https://example.com/?x-ipfs-companion-no-redirect#hashTest'
          }
          await expectNoRedirect(modifyRequest, subRequest, browser)
        })
        it(`should be left untouched if CID is invalid (${nodeType} node)`, async function () {
          const request = url2request('https://google.com/ipfs/notacid?argTest#hashTest')
          await expectNoRedirect(modifyRequest, request, browser)
        })
        it(`should be left untouched if its is a HEAD preload with explicit opt-out in URL hash (${nodeType} node)`, async function () {
          // HTTP HEAD is a popular way for preloading data at arbitrary gateways, so we have a dedicated test to make sure it works as expected
          const headRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#x-ipfs-companion-no-redirect', method: 'HEAD' }
          await expectNoRedirect(modifyRequest, headRequest, browser)
        })
      })
    })
  })

  describe('XHR request for a path matching /ipfs/{CIDv0} coming from 3rd party Origin', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      it('should be served from custom gateway if fetched from the same origin and redirect is enabled in Chromium', async function () {
        const xhrRequest = { url: 'https://google.com/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest', type: 'xmlhttprequest', initiator: 'https://google.com/' }
        // MV2
        // expect((await modifyRequest.onBeforeRequest(xhrRequest)).redirectUrl).to.equal('http://127.0.0.1:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR?argTest#hashTest')
        await modifyRequest.onBeforeRequest(xhrRequest)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `${'^https?\\:\\/\\/google\\.com'}${regexRuleEnding}`,
            'http://127.0.0.1:8080\\1'
          )],
          removeRuleIds: []
        })
      })
    })
  })

  describe('request for a path matching /ipns/{path}', function () {
    describe('with external node', function () {
      beforeEach(function () {
        state.ipfsNodeType = 'external'
      })
      afterEach(function () {
        sinonSandbox.restore()
      })

      it('should be served from custom gateway if {path} points to a FQDN with existing dnslink', async function () {
        const request = url2request('https://google.com/ipns/en.wikipedia-on-ipfs.org/index.html?argTest#hashTest')
        // stub the existence of valid dnslink
        const fqdn = 'en.wikipedia-on-ipfs.org'
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().withArgs(fqdn).resolves('/ipfs/Qmazvovg6Sic3m9igZMKoAPjkiVZsvbWWc8ZvgjjK1qMss')
        // pretend API is online and we can do dns lookups with it
        state.peerCount = 1
        // MV2
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('http://localhost:8080/ipns/en.wikipedia-on-ipfs.org/index.html?argTest#hashTest')
        await modifyRequest.onBeforeRequest(request)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `${'^https?\\:\\/\\/google\\.com'}${regexRuleEnding}`,
            'http://localhost:8080\\1'
          )],
          removeRuleIds: []
        })
      })
      it('should be served from custom gateway if {path} starts with a valid PeerID', async function () {
        const request = url2request('https://google.com/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)
        // MV2
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('http://localhost:8080/ipns/QmSWnBwMKZ28tcgMFdihD8XS7p6QzdRSGf71cCybaETSsU/index.html?argTest#hashTest')
        await modifyRequest.onBeforeRequest(request)
        console.log(browser.declarativeNetRequest.updateDynamicRules.calls)
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
          await expectNoRedirect(modifyRequest, request, browser)
        })
        it(`should be left untouched if FQDN is not a real domain nor a valid CID (${nodeType} node)`, async function () {
          const request = url2request('https://google.com/ipns/notafqdnorcid?argTest#hashTest')
          dnslinkResolver.readDnslinkFromTxtRecord = sinon.stub().resolves(false)
          await expectNoRedirect(modifyRequest, request, browser)
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
      it('should be redirected to localhost gateway (*.ipfs on default gw)', async function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.dweb.link/`)

        /// We expect redirect to path-based gateway because go-ipfs >=0.5 will
        // return redirect to a subdomain, and we don't want to break users
        // running older versions of go-ipfs by loading subdomain first and
        // failing.
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
        //   .to.equal(`http://localhost:8080/ipfs/${cid}/`)
        await modifyRequest.onBeforeRequest(request)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `^https?\\:\\/\\/${cid}\\.ipfs\\.dweb\\.link${regexRuleEnding}`,
            `http://localhost:8080/ipfs/${cid}\\1`
          )],
          removeRuleIds: []
        })
      })
      it('should be redirected to localhost gateway (*.ipfs on 3rd party gw)', async function () {
        state.redirect = true
        const request = url2request(`https://${cid}.ipfs.cf-ipfs.com/`)
        // MV2
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal(`http://localhost:8080/ipfs/${cid}/`)
        await modifyRequest.onBeforeRequest(request)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `^https?\\:\\/\\/${cid}\\.ipfs\\.cf-ipfs\\.com${regexRuleEnding}`,
            `http://localhost:8080/ipfs/${cid}\\1`
          )],
          removeRuleIds: []
        })
      })
      it('should be redirected to localhost gateway and keep URL encoding of original path', async function () {
        state.redirect = true
        const request = url2request('https://bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy.ipfs.dweb.link/%3Ffilename=test.jpg?arg=val')
        // MV2
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
        //   .to.equal('http://localhost:8080/ipfs/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy/%3Ffilename=test.jpg?arg=val')
        await modifyRequest.onBeforeRequest(request)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `^https?\\:\\/\\/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy\\.ipfs\\.dweb\\.link${regexRuleEnding}`,
            `http://localhost:8080/ipfs/bafybeigfejjsuq5im5c3w3t3krsiytszhfdc4v5myltcg4myv2n2w6jumy\\1`
          )],
          removeRuleIds: []
        })
      })
      it('should be redirected to localhost gateway (*.ipns on default gw)', async function () {
        state.redirect = true
        const request = url2request(`https://${peerid}.ipns.dweb.link/`)
        // MV2
        // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl)
        //  .to.equal(`http://localhost:8080/ipns/${peerid}/`)
        await modifyRequest.onBeforeRequest(request)
        const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
        expect(args).to.deep.equal({
          addRules: [generateAddRule(
            args.addRules[0].id,
            `^https?\\:\\/\\/${peerid}\\.ipns\\.dweb\\.link${regexRuleEnding}`,
            `http://localhost:8080/ipns/${peerid}\\1`
          )],
          removeRuleIds: []
        })
      })
    })
  })

  describe('Recovers Page if node is unreachable', function () {
    beforeEach(function () {
      global.browser = browser
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
      state.redirect = true
      const request = url2request('https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')
      // mv2
      // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2Fbar')
      await modifyRequest.onBeforeRequest(request)
      const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args

      expect(args.addRules[0]).to.deep.equal(generateAddRule(
        args.addRules[0].id,
        `^https?\\:\\/\\/localhost\\:8080\\/ipfs\\/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR\\/foo\\/${regexRuleEnding}`,
        `chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2F\\1`
      ))
    })
    it('should present recovery page if node is offline and redirect is disabled', async function () {
      expect(state.nodeActive).to.be.equal(false)
      state.redirect = false
      const request = url2request('https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')
      // mv2
      // expect((await modifyRequest.onBeforeRequest(request)).redirectUrl).to.equal('chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2Fbar')
      await modifyRequest.onBeforeRequest(request)
      const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args

      expect(args.addRules[0]).to.deep.equal(generateAddRule(
        args.addRules[0].id,
        `^https?\\:\\/\\/localhost\\:8080\\/ipfs\\/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR\\/foo\\/${regexRuleEnding}`,
        `chrome-extension://testid/dist/recovery/recovery.html#https%3A%2F%2Fipfs.io%2Fipfs%2FQmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR%2Ffoo%2F\\1`
      ))
    })
    it('should not show recovery page if node is offline, redirect is enabled, but non-gateway URL failed to load from the same port', async function () {
      // this covers https://github.com/ipfs/ipfs-companion/issues/1162 and https://twitter.com/unicomp21/status/1626244123102679041
      state.redirect = true
      expect(state.nodeActive).to.be.equal(false)
      const request = url2request('https://localhost:8080/')
      // mv2
      // expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      await modifyRequest.onBeforeRequest(request)
      await expectNoRedirect(modifyRequest, request, browser)
    })
    it('should not show recovery page if extension is disabled', async function () {
      // allows user to quickly avoid anything similar to https://github.com/ipfs/ipfs-companion/issues/1162
      state.active = false
      expect(state.nodeActive).to.be.equal(false)
      const request = url2request('https://localhost:8080/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/foo/bar')
      // mv2
      // expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
      await modifyRequest.onBeforeRequest(request)
      await expectNoRedirect(modifyRequest, request, browser)
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    sinonSandbox.restore()
    browser.flush()
  })
})
