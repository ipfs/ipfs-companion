'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
const createRuntimeChecks = require('../../../add-on/src/lib/runtime-checks')

describe('runtime-checks.js', function () {
  before(() => {
    global.browser = browser
  })

  beforeEach(function () {
    browser.flush()
  })

  describe('isFirefox', function () {
    beforeEach(function () {
      browser.flush()
    })

    // current version of sinon-chrome is missing stubs for some APIs,
    // this is a workaround until fix is provided upstream
    function promiseStub (result) {
      return () => {
        return Promise.resolve(result)
      }
    }

    it('should return true when in Firefox runtime', async function () {
      browser.runtime.getBrowserInfo = promiseStub({ name: 'Firefox' })
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.isFirefox).to.equal(true)
    })

    it('should return false when not in Firefox runtime', async function () {
      browser.runtime.getBrowserInfo = promiseStub({ name: 'SomethingElse' })
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.isFirefox).to.equal(false)
    })
  })

  describe('isAndroid', function () {
    beforeEach(function () {
      browser.flush()
    })

    it('should return true when in Android runtime', async function () {
      browser.runtime.getPlatformInfo.returns({ os: 'android' })
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.isAndroid).to.equal(true)
    })

    it('should return false when not in Android runtime', async function () {
      browser.runtime.getPlatformInfo.returns({ name: 'SomethingElse' })
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.isAndroid).to.equal(false)
    })
  })

  describe('hasNativeProtocolHandler', function () {
    beforeEach(function () {
      browser.flush()
    })

    it('should return true when browser.protocol namespace is present', async function () {
      // pretend API is in place
      browser.protocol = {}
      browser.protocol.registerStringProtocol = () => Promise.resolve({})
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.hasNativeProtocolHandler).to.equal(true)
    })

    it('should return false browser.protocol APIs are missing', async function () {
      // API is missing
      browser.protocol = undefined
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.hasNativeProtocolHandler).to.equal(false)
    })
  })

  after(function () {
    delete global.browser
    browser.flush()
  })
})
