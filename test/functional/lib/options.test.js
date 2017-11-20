'use strict'
const { describe, it, beforeEach, after } = require('mocha')
const sinon = require('sinon')
const browser = require('sinon-chrome')
const { storeMissingOptions, optionDefaults } = require('../../../add-on/src/lib/options')

describe('storeMissingOptions()', function () {
  beforeEach(() => {
    browser.flush()
  })

  it('should save all defaults during first run when no value is present in storage', done => {
    browser.storage.local.get.returns(Promise.resolve({})) // simulates empty storage
    browser.storage.local.set.returns(Promise.resolve({}))
    const read = Object.assign({}, optionDefaults)
    storeMissingOptions(read, optionDefaults, browser.storage.local)
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
    storeMissingOptions(read, optionDefaults, browser.storage.local)
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
    storeMissingOptions(read, optionDefaults, browser.storage.local)
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

  after(() => {
    browser.flush()
  })
})
