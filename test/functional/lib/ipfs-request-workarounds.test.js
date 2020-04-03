'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const { expect, assert } = require('chai')
const { URL } = require('url') // URL implementation with support for .origin attribute
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const { createRuntimeChecks } = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier } = require('../../../add-on/src/lib/ipfs-request')
const createDNSLinkResolver = require('../../../add-on/src/lib/dnslink')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

// const nodeTypes = ['external', 'embedded']

describe('modifyRequest processing', function () {
  let state, getState, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    // stub URL.origin in test context to return something other than null
    Object.defineProperty(URL.prototype, 'origin', {
      get: function () {
        const fakeOrigin = this.href.split('/')
        if (fakeOrigin.length >= 3) {
          return fakeOrigin.slice(0, 3).join('/')
        }
      }
    })
    global.URL = URL
    global.browser = browser
  })

  beforeEach(async function () {
    state = initState(optionDefaults)
    getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDNSLinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  // Additional handling is required for redirected IPFS subresources on regular HTTPS pages
  // (eg. image embedded from public gateway on HTTPS website)
  describe('a subresource request on HTTPS website', function () {
    const cid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
    it('should be routed to "127.0.0.1" gw in Chromium if type is image', function () {
      runtime.isFirefox = false
      const request = {
        method: 'GET',
        type: 'image',
        url: `https://ipfs.io/ipfs/${cid}`,
        initiator: 'https://some-website.example.com' // Chromium
      }
      expect(modifyRequest.onBeforeRequest(request).redirectUrl)
        .to.equal(`http://127.0.0.1:8080/ipfs/${cid}`)
    })
    it('should be routed to "localhost" gw in Chromium if not a subresource', function () {
      runtime.isFirefox = false
      const request = {
        method: 'GET',
        type: 'main_frame',
        url: `https://ipfs.io/ipfs/${cid}`,
        initiator: 'https://some-website.example.com' // Chromium
      }
      expect(modifyRequest.onBeforeRequest(request).redirectUrl)
        .to.equal(`http://localhost:8080/ipfs/${cid}`)
    })
    it('should be routed to "127.0.0.1" gw to avoid mixed content warning in Firefox', function () {
      runtime.isFirefox = true
      const request = {
        method: 'GET',
        type: 'image',
        url: `https://ipfs.io/ipfs/${cid}`,
        originUrl: 'https://some-website.example.com/some/page.html' // FF only
      }
      expect(modifyRequest.onBeforeRequest(request).redirectUrl)
        .to.equal(`http://127.0.0.1:8080/ipfs/${cid}`)
    })
    it('should be routed to "localhost" gw in Firefox if not a subresource', function () {
      runtime.isFirefox = true
      const request = {
        method: 'GET',
        type: 'main_frame',
        url: `https://ipfs.io/ipfs/${cid}`,
        originUrl: 'https://some-website.example.com/some/page.html' // FF only
      }
      expect(modifyRequest.onBeforeRequest(request).redirectUrl)
        .to.equal(`http://localhost:8080/ipfs/${cid}`)
    })
  })

  describe('a request to <apiURL>/api/v0/add with stream-channels=true', function () {
    const expectHeader = { name: 'Expect', value: '100-continue' }
    it('should apply the "Expect: 100-continue" fix for https://github.com/ipfs/go-ipfs/issues/5168 ', function () {
      const request = {
        method: 'POST',
        requestHeaders: [
          { name: 'Content-Type', value: 'multipart/form-data; boundary=--------------------------015695779813832455524979' }
        ],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/add?progress=true&wrapWithDirectory=true&pin=true&wrap-with-directory=true&stream-channels=true`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.deep.include(expectHeader)
    })
  })

  describe('a request to <apiURL>/api/v0/ made with extension:// Origin', function () {
    it('should have it replaced with API one if Origin: moz-extension://{extension-installation-id}', async function () {
      // Context: Firefox 65 started setting this header
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df' }
      const apiOriginHeader = { name: 'Origin', value: getState().apiURL.origin }
      const request = {
        requestHeaders: [bogusOriginHeader],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(apiOriginHeader)
      browser.runtime.getURL.flush()
    })
  })

  describe('should have it removed if Origin: chrome-extension://{extension-installation-id}', function () {
    it('should have it swapped with API one if Origin: with chrome-extension://', async function () {
      // Context: Chromium 72 started setting this header
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('chrome-extension://trolrorlrorlrol/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'chrome-extension://trolrorlrorlrol' }
      const apiOriginHeader = { name: 'Origin', value: getState().apiURL.origin }
      const request = {
        requestHeaders: [bogusOriginHeader],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(apiOriginHeader)
      browser.runtime.getURL.flush()
    })
  })

  describe('a request to <apiURL>/api/v0/ with Origin=null', function () {
    it('should keep the "Origin: null" header ', async function () {
      // Presence of Origin header is important as it protects API from XSS via sandboxed iframe
      // NOTE: Chromium <72 was setting this header in requests sent by browser extension,
      // but they fixed it since then.
      browser.runtime.getURL.withArgs('/').returns(undefined)
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const nullOriginHeader = { name: 'Origin', value: 'null' }
      const request = {
        requestHeaders: [nullOriginHeader],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders)
        .to.deep.include(nullOriginHeader)
      browser.runtime.getURL.flush()
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
        statusCode: 404,
        type: 'main_frame',
        url: brokenDNSLinkUrl
      }
      browser.tabs.update.flush()
      assert.ok(browser.tabs.update.notCalled)
      modifyRequest.onCompleted(request)
      assert.ok(browser.tabs.update.withArgs({ url: fixedDNSLinkUrl }).calledOnce)
      browser.tabs.update.flush()
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
