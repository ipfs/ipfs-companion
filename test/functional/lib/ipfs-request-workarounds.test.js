'use strict'
import { assert, expect } from 'chai'
import { after, afterEach, before, beforeEach, describe, it } from 'mocha'
import browser from 'sinon-chrome'
import { URL } from 'url' // URL implementation with support for .origin attribute
import createDNSLinkResolver from '../../../add-on/src/lib/dnslink.js'
import { braveNodeType } from '../../../add-on/src/lib/ipfs-client/brave.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import { cleanupRules } from '../../../add-on/src/lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import isManifestV3 from '../../helpers/is-mv3-testing-enabled.js'
import { ensureCallRedirected, expectNoRedirect } from '../../helpers/mv3-test-helper.js'
import { spoofDnsTxtRecord } from './dnslink.test.js'

describe('modifyRequest processing', function () {
  let state, getState, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    global.URL = URL
    global.browser = browser
    browser.runtime.id = 'testid'
  })

  beforeEach(async function () {
    browser.runtime.getURL.flush()
    state = initState(optionDefaults)
    getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDNSLinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  afterEach(async function () {
    if (isManifestV3) {
      await cleanupRules(true)
    }
  })

  // Additional handling is required for redirected IPFS subresources on regular HTTPS pages
  // (eg. image embedded from public gateway on HTTPS website)
  describe('a subresource request on HTTPS website', function () {
    const cid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
    it('should be routed to "127.0.0.1" gw in Chromium if type is image', async function () {
      runtime.isFirefox = false
      const request = {
        method: 'GET',
        type: 'image',
        url: `https://ipfs.io/ipfs/${cid}`,
        initiator: 'https://some-website.example.com' // Chromium
      }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: `http://127.0.0.1:8080/ipfs/${cid}`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/ipfs\\.io',
          destination: 'http://127.0.0.1:8080'
        }
      })
    })
    it('should be routed to "localhost" gw in Chromium if not a subresource', async function () {
      runtime.isFirefox = false
      const request = {
        method: 'GET',
        type: 'main_frame',
        url: `https://ipfs.io/ipfs/${cid}`,
        initiator: 'https://some-website.example.com' // Chromium
      }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: `http://localhost:8080/ipfs/${cid}`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/ipfs\\.io',
          destination: 'http://localhost:8080'
        }
      })
    })
    it('should be routed to "127.0.0.1" gw to avoid mixed content warning in Firefox', async function () {
      runtime.isFirefox = true
      const request = {
        method: 'GET',
        type: 'image',
        url: `https://ipfs.io/ipfs/${cid}`,
        originUrl: 'https://some-website.example.com/some/page.html' // FF only
      }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: `http://127.0.0.1:8080/ipfs/${cid}`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/ipfs\\.io',
          destination: 'http://127.0.0.1:8080'
        }
      })
    })
    it('should be routed to "localhost" gw in Firefox if not a subresource', async function () {
      runtime.isFirefox = true
      const request = {
        method: 'GET',
        type: 'main_frame',
        url: `https://ipfs.io/ipfs/${cid}`,
        originUrl: 'https://some-website.example.com/some/page.html' // FF only
      }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: `http://localhost:8080/ipfs/${cid}`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/ipfs\\.io',
          destination: 'http://localhost:8080'
        }
      })
    })
  })

  describe('a request to <apiURL>/api/v0/add with stream-channels=true', function () {
    const expectHeader = { name: 'Expect', value: '100-continue' }
    it('should apply the "Expect: 100-continue" fix for https://github.com/ipfs/go-ipfs/issues/5168 ', async function () {
      const request = {
        method: 'POST',
        requestHeaders: [
          { name: 'Content-Type', value: 'multipart/form-data; boundary=--------------------------015695779813832455524979' }
        ],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/add?progress=true&wrapWithDirectory=true&pin=true&wrap-with-directory=true&stream-channels=true`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.deep.include(expectHeader)
    })
  })

  // The Origin header set by browser for requests coming from within a browser
  // extension has been a mess for years, and by now we simply have zero trust
  // in stability of this header. Instead, we use WebExtension's webRequest API
  // to tell if a request comes from our browser extension and manually set
  // Origin to look like a request coming from the same Origin as IPFS API.
  //
  // The full context can be found in ipfs-request.js, where isCompanionRequest
  // check is executed.
  describe('Origin header in a request to <apiURL>/api/v0/', function () {
    it('set to API if request comes from Companion in Firefox <85', async function () {
      // Context: Firefox 65 started setting this header
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const originalOriginHeader = { name: 'Origin', value: 'moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df' }
      const apiOriginHeader = { name: 'Origin', value: getState().apiURL.origin }
      const request = {
        requestHeaders: [originalOriginHeader],
        originUrl: 'moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/path/to/background.html', // FF specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(apiOriginHeader)
    })

    it('set to API if request comes from Companion in Firefox 85', async function () {
      // Context: https://github.com/ipfs-shipyard/ipfs-companion/issues/955#issuecomment-753413988
      browser.runtime.getURL.withArgs('/').returns('moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const originalOriginHeader = { name: 'Origin', value: 'null' }
      const apiOriginHeader = { name: 'Origin', value: getState().apiURL.origin }
      const request = {
        requestHeaders: [originalOriginHeader],
        originUrl: 'moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/path/to/background.html', // FF specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(apiOriginHeader)
    })

    it('set to API if request comes from Companion in Chromium <72', async function () {
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'null' }
      const apiOriginHeader = { name: 'Origin', value: getState().apiURL.origin }
      const request = {
        requestHeaders: [bogusOriginHeader],
        initiator: 'chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch/', // Chromium specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(apiOriginHeader)
    })

    it('set to API if request comes from Companion in Chromium 72', async function () {
      // Context: Chromium 72 started setting this header to chrome-extension:// URI
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch' }
      const apiOriginHeader = { name: 'Origin', value: getState().apiURL.origin }
      const request = {
        requestHeaders: [bogusOriginHeader],
        initiator: 'chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch/', // Chromium specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(apiOriginHeader)
    })

    it('keep Origin as-is if request does not come from Companion (Chromium)', async function () {
      browser.runtime.getURL.withArgs('/').returns('chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const originHeader = { name: 'Origin', value: 'https://some.website.example.com' }
      const expectedOriginHeader = { name: 'Origin', value: 'https://some.website.example.com' }
      const request = {
        requestHeaders: [originHeader],
        initiator: 'https://some.website.example.com', // Chromium specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(expectedOriginHeader)
    })

    it('keep Origin as-is if request does not come from Companion (Firefox)', async function () {
      browser.runtime.getURL.withArgs('/').returns('moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const originHeader = { name: 'Origin', value: 'https://some.website.example.com' }
      const expectedOriginHeader = { name: 'Origin', value: 'https://some.website.example.com' }
      const request = {
        requestHeaders: [originHeader],
        originUrl: 'https://some.website.example.com/some/path.html', // Firefox specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(expectedOriginHeader)
    })

    it('keep the "Origin: null" if request does not come from Companion (Chromium)', async function () {
      // Presence of Origin header is important as it protects API from XSS via sandboxed iframe
      // NOTE: Chromium <72 was setting this header in requests sent by browser extension,
      // but they fixed it since then, and we switched to reading origin via webRequest API,
      // which is independent from the HTTP header.
      browser.runtime.getURL.withArgs('/').returns('chrome-extension://nibjojkomfdiaoajekhjakgkdhaomnch/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const nullOriginHeader = { name: 'Origin', value: 'null' }
      const expectedOriginHeader = { name: 'Origin', value: 'null' }
      const request = {
        requestHeaders: [nullOriginHeader],
        initiator: 'https://random.website.example.com', // Chromium specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(expectedOriginHeader)
    })

    it('keep the "Origin: null" if request does not come from Companion (Firefox)', async function () {
      // Presence of Origin header is important as it protects API from XSS via sandboxed iframe
      browser.runtime.getURL.withArgs('/').returns('moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const nullOriginHeader = { name: 'Origin', value: 'null' }
      const expectedOriginHeader = { name: 'Origin', value: 'null' }
      const request = {
        requestHeaders: [nullOriginHeader],
        originUrl: 'https://random.website.example.com/some/path.html', // Firefox specific WebExtension API
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      await modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(expectedOriginHeader)
    })
  })

  // We've moved blog to blog.ipfs.io but links to ipfs.io/blog/*
  // are still around due to the way Discourse integration was done for comments.
  // https://github.com/ipfs/blog/issues/360
  describe('a failed main_frame request to /ipns/ipfs.io/blog', function () {
    it('should be updated to /ipns/blog.ipfs.io', async function () {
      const brokenDNSLinkUrl = 'http://example.com/ipns/ipfs.io/blog/some-post'
      const fixedDNSLinkUrl = 'http://example.com/ipns/blog.ipfs.io/some-post'
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const request = {
        tabId: 42404,
        statusCode: 404,
        type: 'main_frame',
        url: brokenDNSLinkUrl
      }
      browser.tabs.update.resetHistory()
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: fixedDNSLinkUrl }).notCalled)
      await modifyRequest.onCompleted(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: fixedDNSLinkUrl }).calledOnce)
      browser.tabs.update.resetHistory()
    })
  })

  // Brave seems to ignore redirect to ipfs:// and ipns://, but if we force tab update via tabs API,
  // then address bar is correct
  describe('redirect of main_frame request to local gateway when Brave node is used', function () {
    it('should force native URI in address bar via tabs.update API', async function () {
      const httpDNSLinkUrl = 'https://example.com/ipns/docs.ipfs.io/some/path?query=val'
      const nativeDNSLinkUri = 'ipns://docs.ipfs.io/some/path?query=val'
      spoofDnsTxtRecord('docs.ipfs.io', dnslinkResolver, '/ipfs/bafkqae2xmvwgg33nmuqhi3zajfiemuzahiwss')
      state.ipfsNodeType = braveNodeType
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const request = {
        tabId: 42,
        type: 'main_frame',
        url: httpDNSLinkUrl
      }
      browser.tabs.update.resetHistory()
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: nativeDNSLinkUri }).notCalled)
      await modifyRequest.onBeforeRequest(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: nativeDNSLinkUri }).calledOnce)
      browser.tabs.update.resetHistory()
    })
  })

  // https://github.com/ipfs-shipyard/ipfs-companion/issues/962
  describe('redirect of IPFS resource to local gateway in Brave', async function () {
    it('should be redirected if not a subresource (not impacted by Brave Shields)', async function () {
      runtime.isFirefox = false
      runtime.brave = { thisIsFakeBraveRuntime: true }
      const request = {
        method: 'GET',
        type: 'image',
        url: 'https://ipfs.io/ipfs/bafkqae2xmvwgg33nmuqhi3zajfiemuzahiwss',
        initiator: 'https://some-website.example.com' // Brave (built on Chromium)
      }
      await expectNoRedirect(modifyRequest, request)
    })
    it('should be left untouched if subresource (would be blocked by Brave Shields)', async function () {
      runtime.isFirefox = false
      runtime.brave = { thisIsFakeBraveRuntime: true }
      const cid = 'bafkqae2xmvwgg33nmuqhi3zajfiemuzahiwss'
      const request = {
        method: 'GET',
        type: 'main_frame',
        url: `https://ipfs.io/ipfs/${cid}`,
        initiator: 'https://some-website.example.com' // Brave (built on Chromium)
      }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        MV2Expectation: `http://localhost:8080/ipfs/${cid}`,
        MV3Expectation: {
          origin: '^https?\\:\\/\\/ipfs\\.io',
          destination: 'http://localhost:8080'
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
