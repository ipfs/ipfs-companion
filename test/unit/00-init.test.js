'use strict'
/* eslint-env mocha */
/* globals withOptions, saveDefaultOptions, optionDefaults */

describe('init.js', function () {

  describe('withOptions', function () {
    it('should query local storage with hardcoded defaults for fallback', function (done) {
      chrome.storage.local.get.yields(optionDefaults)
      withOptions((options) => {
        sinon.assert.calledOnce(chrome.storage.local.get)
        sinon.assert.calledWith(chrome.storage.local.get, optionDefaults)
        expect(options).to.equal(optionDefaults)
        done()
      })
    })
  })

  describe('saveDefaultOptions', function () {
    it('should save defaults if no value is present in storage', sinon.test(function () {
      chrome.storage.local.get.yields({})
      saveDefaultOptions(optionDefaults)
      for (let key in optionDefaults) {
        // make sure each option was read..
        sinon.assert.calledWith(chrome.storage.local.get, key)
        // .. and the default was saved because it was missing
        // (this is a simulation of first run)
        let option = {}
        option[key] = optionDefaults[key]
        sinon.assert.calledWith(chrome.storage.local.set, option)
      }
      chrome.storage.local.get.flush()
      chrome.storage.local.set.flush()
    }))

    it('should skip modified options', sinon.test(function () {
      let modifiedOption = {ipfsApiUrl: 'http://10.1.2.4:8080'};
      chrome.storage.local.get.withArgs('ipfsApiUrl').yields(modifiedOption)
      chrome.storage.local.get.yields({})
      saveDefaultOptions(optionDefaults)
      for (let key in optionDefaults) {
          let option = {}
          option[key] = optionDefaults[key]
        if (key === 'ipfsApiUrl') {
          sinon.assert.neverCalledWith(chrome.storage.local.set, option)
        } else {
          sinon.assert.calledWith(chrome.storage.local.set, option)
        }
      }
      chrome.storage.local.get.flush()
      chrome.storage.local.set.flush()
    }))
  })

})
