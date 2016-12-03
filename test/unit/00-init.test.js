'use strict'
/* eslint-env webextensions, mocha */
/* globals sinon, assert, URL, init, ipfsApi, IpfsApi, onStorageChange, storeMissingOptions, optionDefaults */

var sandbox

var url2cfg = (string) => {
  const url = new URL(string)
  return {host: url.hostname, port: url.port, procotol: url.protocol}
}

describe('init.js', function () {
  beforeEach(() => {
    browser.flush()
    sandbox = sinon.sandbox.create()
    sandbox.stub(window, 'IpfsApi')
  })

  afterEach(() => {
    sandbox.restore()
    browser.flush()
  })

  describe('init()', function () {
    beforeEach(() => {
      browser.storage.local.get.returns(Promise.resolve(optionDefaults))
      sandbox.stub(window, 'smokeTestLibs')
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
      const defaultIpfsApiUrl = optionDefaults['ipfsApiUrl']
      const defaultCfg = url2cfg(defaultIpfsApiUrl)
      IpfsApi.restore() // remove default stub, as we will need custom one
      sandbox.stub(window, 'IpfsApi').withArgs(defaultCfg).returns(defaultCfg) // echo-like behaviour for easy test
      init()
        .then(() => {
          sinon.assert.calledOnce(IpfsApi)
          sinon.assert.calledWith(IpfsApi, defaultCfg)
          assert.equal(ipfsApi, defaultCfg) // expect echo
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
      const newCfg = url2cfg(newIpfsApiUrl)
      IpfsApi.restore() // remove default stub, as we will need custom one
      sandbox.stub(window, 'IpfsApi').withArgs(newCfg).returns(newCfg)
      onStorageChange(changes, area)
      sinon.assert.calledOnce(IpfsApi)
      sinon.assert.calledWith(IpfsApi, newCfg)
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
