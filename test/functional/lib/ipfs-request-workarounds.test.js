'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const createRuntimeChecks = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier } = require('../../../add-on/src/lib/ipfs-request')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

// const nodeTypes = ['external', 'embedded']

describe('modifyRequest processing', function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    global.URL = URL
    global.browser = browser
  })

  beforeEach(async function () {
    state = initState(optionDefaults)
    const getState = () => state
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
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.deep.include(expectHeader)
    })
  })

  describe('a request to <apiURL>/api/v0/ with Origin=null', function () {
    it('should remove Origin header ', function () {
      const bogusOriginHeader = { name: 'Origin', value: 'null' }
      const request = {
        requestHeaders: [ bogusOriginHeader ],
        type: 'xmlhttprequest',
        url: `${state.apiURLString}api/v0/id`
      }
      expect(modifyRequest.onBeforeSendHeaders(request).requestHeaders).to.not.include(bogusOriginHeader)
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
