'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url') // URL implementation with support for .origin attribute
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const createRuntimeChecks = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier } = require('../../../add-on/src/lib/ipfs-request')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

// const nodeTypes = ['external', 'embedded']

describe('modifyRequest processing', function () {
  let state, getState, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    // stub URL.origin in test context to return something other than null
    Object.defineProperty(URL.prototype, 'origin', {
      get: function () {
        let fakeOrigin = this.href.split('/')
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
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
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

  describe('a request to <apiURL>/api/v0/ with Origin=moz-extension://{extension-installation-id}', function () {
    it('should remove Origin header with moz-extension://', async function () {
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'moz-extension://0f334731-19e3-42f8-85e2-03dbf50026df' }
      const request = {
        requestHeaders: [ bogusOriginHeader ],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.not.include(bogusOriginHeader)
      browser.runtime.getURL.flush()
    })
  })

  describe('a request to <apiURL>/api/v0/ with Origin=chrome-extension://{extension-installation-id}', function () {
    it('should remove Origin header with chrome-extension://', async function () {
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns('chrome-extension://trolrorlrorlrol/')
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'chrome-extension://trolrorlrorlrol' }
      const request = {
        requestHeaders: [ bogusOriginHeader ],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.not.include(bogusOriginHeader)
      browser.runtime.getURL.flush()
    })
  })

  describe('a request to <apiURL>/api/v0/ with Origin=null', function () {
    it('should remove Origin header ', async function () {
      // set vendor-specific Origin for WebExtension context
      browser.runtime.getURL.withArgs('/').returns(undefined)
      // ensure clean modifyRequest
      runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
      modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
      // test
      const bogusOriginHeader = { name: 'Origin', value: 'null' }
      const request = {
        requestHeaders: [ bogusOriginHeader ],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      modifyRequest.onBeforeRequest(request) // executes before onBeforeSendHeaders, may mutate state
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.not.include(bogusOriginHeader)
      browser.runtime.getURL.flush()
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
