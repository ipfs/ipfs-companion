'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
const createFeatureDetector = require('../../../add-on/src/lib/feature-detector')

// https://github.com/ipfs/ipfs-companion/issues/303
describe('featureDetector', function () {
  before(() => {
    global.browser = browser
  })

  beforeEach(function () {
    browser.flush()
  })

  describe('getState', function () {
    it('should return current state', async function () {
      const getState = () => ({test: 'ok'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.getState().test).to.equal('ok')
    })
  })

  describe('inFirefox', function () {
    const getState = () => ({})

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
      browser.runtime.getBrowserInfo = promiseStub({name: 'Firefox'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.inFirefox()).to.equal(true)
    })

    it('should return false when not in Firefox runtime', async function () {
      browser.runtime.getBrowserInfo = promiseStub({name: 'SomethingElse'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.inFirefox()).to.equal(false)
    })
  })

  describe('inAndroid', function () {
    const getState = () => ({})

    beforeEach(function () {
      browser.flush()
    })

    it('should return true when in Android runtime', async function () {
      browser.runtime.getPlatformInfo.returns({os: 'android'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.inAndroid()).to.equal(true)
    })

    it('should return false when not in Android runtime', async function () {
      browser.runtime.getPlatformInfo.returns({name: 'SomethingElse'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.inAndroid()).to.equal(false)
    })
  })

  describe('embeddedNodeIsActive', function () {
    it('should return true when js-ipfs node is active', async function () {
      const getState = () => ({ipfsNodeType: 'embedded'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.embeddedNodeIsActive()).to.equal(true)
    })

    it('should return false when js-ipfs node is not active', async function () {
      const getState = () => ({ipfsNodeType: 'external'})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.embeddedNodeIsActive()).to.equal(false)
    })
  })

  describe('inBrowserWithNativeProtocol', function () {
    const getState = () => ({})

    beforeEach(function () {
      browser.flush()
    })

    it('should return true when browser.protocol namespace is present', async function () {
      // pretend API is in place
      browser.protocol = {}
      browser.protocol.registerStringProtocol = () => Promise.resolve({})
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.inBrowserWithNativeProtocol()).to.equal(true)
    })

    it('should return false browser.protocol APIs are missing', async function () {
      // API is missing
      browser.protocol = undefined
      const featureDetector = await createFeatureDetector(getState, browser)
      expect(featureDetector.inBrowserWithNativeProtocol()).to.equal(false)
    })
  })

  after(function () {
    delete global.browser
    browser.flush()
  })
})
