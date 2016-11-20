'use strict'
/* eslint-env webextensions, mocha */
/* globals sinon, assert, init, initIpfsApi, onStorageChange, storeMissingOptions, optionDefaults */

var sandbox

describe('init.js', () => {
  beforeEach(() => {
    browser.flush()
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
    browser.flush()
  })

  describe('init()', function () {
    const defaultIpfsApiUrl = optionDefaults['ipfsApiUrl']
    beforeEach(() => {
      browser.storage.local.get.returns(Promise.resolve(optionDefaults))
      sandbox.stub(window, 'smokeTestLibs')
      sandbox.stub(window, 'initIpfsApi').returns({url: defaultIpfsApiUrl})
    })
    it('should query local storage for options with hardcoded defaults for fallback', done => {
      init()
        .then(() => {
          sinon.assert.calledWith(browser.storage.local.get, optionDefaults)
          done()
        })
        .catch(error => { done(error) })
    })
    it('should create ipfsApi instance from URL in storage', done => {
      init()
        .then(() => {
          sinon.assert.calledOnce(initIpfsApi)
          sinon.assert.calledWith(initIpfsApi, defaultIpfsApiUrl)
          assert.equal(window.ipfsApi.url, defaultIpfsApiUrl)
          done()
        })
        .catch(error => { done(error) })
    })
  })

  describe('onStorageChange()', function () {
    it('should update ipfsApi instance on IPFS API URL change', () => {
      const oldIpfsApiUrl = 'http://127.0.0.1:5001'
      const newIpfsApiUrl = 'http://1.2.3.4:8080'
      const changes = {ipfsApiUrl: {oldValue: oldIpfsApiUrl, newValue: newIpfsApiUrl}}
      const area = 'local'
      sandbox.stub(window, 'initIpfsApi').returns({url: newIpfsApiUrl})
      onStorageChange(changes, area)
      sinon.assert.calledOnce(initIpfsApi)
      sinon.assert.calledWith(initIpfsApi, newIpfsApiUrl)
      assert.equal(window.ipfsApi.url, newIpfsApiUrl)
    })
  })

  describe('storeMissingOptions()', function () {
    it('should save all defaults during first run when no value is present in storage', done => {
      browser.storage.local.get.returns(Promise.resolve({})) // simulates empty storage
      browser.storage.local.set.returns(Promise.resolve({}))
      const read = Object.assign({}, optionDefaults)
      storeMissingOptions(read, optionDefaults)
        .then(changes => {
          // console.log(`Default changes: ${JSON.stringify(changes)} (size: ${changes.length})`)
          for (let key in optionDefaults) {
            // make sure each option was read..
            sinon.assert.calledWith(browser.storage.local.get, key)
            // .. and the default was saved because it was missing
            // (this is a simulation of first run)
            let option = {}
            option[key] = optionDefaults[key]
            sinon.assert.calledWith(browser.storage.local.set, option)
          }
          done()
        })
        .catch(error => { done(error) })
    })
    it('should not touch non-default value present in storage', done => {
      const read = Object.assign({}, optionDefaults)
      const modifiedKey = 'useCustomGateway'
      read[modifiedKey] = !optionDefaults[modifiedKey] // simulate custom option set by user
      browser.storage.local.get.returns(Promise.resolve(read)) // simulate data read from storage
      browser.storage.local.set.returns(Promise.resolve({}))
      storeMissingOptions(read, optionDefaults)
        .then(changes => {
          // console.log(`Default changes: ${JSON.stringify(changes)} (size: ${changes.length})`)
          sinon.assert.neverCalledWith(browser.storage.local.get, modifiedKey)
          sinon.assert.neverCalledWith(browser.storage.local.set, modifiedKey)
          done()
        })
        .catch(error => { done(error) })
    })
    it('should initialize default value for key missing from both read options and storage', done => {
      const read = Object.assign({}, optionDefaults)
      const missingKey = 'customGatewayUrl'
      delete read[missingKey] // simulate key not being in storage for some reason
      browser.storage.local.get.returns(Promise.resolve(read)) // simulate read from storage
      browser.storage.local.set.returns(Promise.resolve({}))
      storeMissingOptions(read, optionDefaults)
        .then(changes => {
          // console.log(`Default changes: ${JSON.stringify(changes)} (size: ${changes.length})`)
          sinon.assert.calledWith(browser.storage.local.get, missingKey)
          let option = {}
          option[missingKey] = optionDefaults[missingKey]
          sinon.assert.calledWith(browser.storage.local.set, option)
          done()
        })
        .catch(error => { done(error) })
    })
  })
})
