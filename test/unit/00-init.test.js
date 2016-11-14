'use strict'
/* eslint-env webextensions, mocha */
/* globals sinon, expect, withOptions, saveDefaultOptions, optionDefaults */

describe('init.js', function () {
  describe('withOptions', function () {
    it('should query local storage with hardcoded defaults for fallback', function (done) {
      browser.storage.local.get.yields(optionDefaults)
      withOptions((options) => {
        sinon.assert.calledOnce(browser.storage.local.get)
        sinon.assert.calledWith(browser.storage.local.get, optionDefaults)
        expect(options).to.equal(optionDefaults)
        done()
      })
    })
  })

  describe('saveDefaultOptions', function () {
    it('should save defaults if no value is present in storage', sinon.test(function () {
      browser.storage.local.get.yields({})
      saveDefaultOptions(optionDefaults)
      for (let key in optionDefaults) {
        // make sure each option was read..
        sinon.assert.calledWith(browser.storage.local.get, key)
        // .. and the default was saved because it was missing
        // (this is a simulation of first run)
        let option = {}
        option[key] = optionDefaults[key]
        sinon.assert.calledWith(browser.storage.local.set, option)
      }
      browser.storage.local.get.flush()
      browser.storage.local.set.flush()
    }))

    it('should skip modified options', sinon.test(function () {
      let modifiedOption = {ipfsApiUrl: 'http://10.1.2.4:8080'}
      browser.storage.local.get.withArgs('ipfsApiUrl').yields(modifiedOption)
      browser.storage.local.get.yields({})
      saveDefaultOptions(optionDefaults)
      for (let key in optionDefaults) {
        let option = {}
        option[key] = optionDefaults[key]
        if (key === 'ipfsApiUrl') {
          sinon.assert.neverCalledWith(browser.storage.local.set, option)
        } else {
          sinon.assert.calledWith(browser.storage.local.set, option)
        }
      }
      browser.storage.local.get.flush()
      browser.storage.local.set.flush()
    }))
  })
})
