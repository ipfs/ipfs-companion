'use strict'
/* eslint-env browser, webextensions */

const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
const { createRuntimeChecks, hasChromeSocketsForTcp } = require('../../../add-on/src/lib/runtime-checks')
const promiseStub = (result) => () => Promise.resolve(result)

describe('runtime-checks.js', function () {
  before(() => {
    global.browser = browser
    global.chrome = {}
  })

  beforeEach(function () {
    browser.flush()
  })

  describe('isFirefox', function () {
    beforeEach(function () {
      browser.flush()
    })

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

  describe('requiresXHRCORSfix', function () {
    beforeEach(function () {
      browser.flush()
    })

    it('should return true when in Firefox runtime < 69', async function () {
      browser.runtime.getBrowserInfo = promiseStub({ name: 'Firefox', version: '68.0.0' })
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.requiresXHRCORSfix).to.equal(true)
    })

    it('should return false when in Firefox runtime >= 69', async function () {
      browser.runtime.getBrowserInfo = promiseStub({ name: 'Firefox', version: '69.0.0' })
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.requiresXHRCORSfix).to.equal(false)
    })

    it('should return false when  if getBrowserInfo is not present', async function () {
      browser.runtime.getBrowserInfo = undefined
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.requiresXHRCORSfix).to.equal(false)
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

  describe('isBrave', function () {
    beforeEach(function () {
      browser.flush()
    })

    it('should return true when expected chrome.sockets.tcp* are present', async function () {
      chrome.runtime = { id: 'fakeid' }
      chrome.sockets = { tcpServer: {}, tcp: {} }
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.isBrave).to.equal(true)
      /* TODO: right now its just an alias for hasChromeSocketsForTcpm but
         we need to find a better way to tell Brave from Opera */
      expect(runtime.isBrave).to.equal(runtime.hasChromeSocketsForTcp)
    })

    it('should return false when chrome.sockets.tcp* are missing', async function () {
      delete chrome.sockets
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.isBrave).to.equal(false)
      /* TODO: right now its just an alias for hasChromeSocketsForTcpm but
         we need to find a better way to tell Brave from Opera */
      expect(runtime.isBrave).to.equal(runtime.hasChromeSocketsForTcp)
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

  describe('hasChromeSocketsForTcp', function () {
    beforeEach(function () {
      browser.flush()
    })

    it('should return true when expected chrome.sockets.tcp* are present', async function () {
      chrome.runtime = { id: 'fakeid' }
      chrome.sockets = { tcpServer: {}, tcp: {} }
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.hasChromeSocketsForTcp).to.equal(true)
      // static version should return the same value
      expect(runtime.hasChromeSocketsForTcp).to.equal(hasChromeSocketsForTcp())
    })

    it('should return false when chrome.sockets.tcp* are missing', async function () {
      delete chrome.sockets
      const runtime = await createRuntimeChecks(browser)
      expect(runtime.hasChromeSocketsForTcp).to.equal(false)
      // static version should return the same value
      expect(runtime.hasChromeSocketsForTcp).to.equal(hasChromeSocketsForTcp())
    })
  })

  after(function () {
    delete global.browser
    browser.flush()
  })
})
