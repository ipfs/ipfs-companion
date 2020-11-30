'use strict'
const { describe, it, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const sinon = require('sinon')
const browser = require('sinon-chrome')
const { storeMissingOptions, optionDefaults, isHostname, hostTextToArray, hostArrayToText } = require('../../../add-on/src/lib/options')
const { URL } = require('url')

describe('storeMissingOptions()', function () {
  beforeEach(() => {
    global.URL = URL
    browser.flush()
  })

  it('should save all defaults during first run when no value is present in storage', done => {
    browser.storage.local.get.returns(Promise.resolve({})) // simulates empty user storage (clean install)
    browser.storage.local.set.returns(Promise.resolve({}))
    const read = Object.assign({}, optionDefaults)
    storeMissingOptions(read, optionDefaults, browser.storage.local)
      .then(changes => {
        sinon.assert.calledWith(browser.storage.local.set, changes)
        expect(changes).to.be.deep.equal(optionDefaults)
        done()
      })
      .catch(error => { done(error) })
  })
  it('should not touch non-default value present in storage', done => {
    const read = Object.assign({}, optionDefaults)
    const userModifiedKey = 'linkify'
    read[userModifiedKey] = !optionDefaults[userModifiedKey] // simulate custom option set by user
    browser.storage.local.get.returns(Promise.resolve(read)) // simulate existing user data read from storage
    browser.storage.local.set.returns(Promise.resolve({}))
    storeMissingOptions(read, optionDefaults, browser.storage.local)
      .then(changes => {
        sinon.assert.calledWith(browser.storage.local.set, changes)
        expect(changes).to.be.deep.equal({})
        done()
      })
      .catch(error => { done(error) })
  })

  it('should initialize default value for key missing from both read options and storage', done => {
    const read = Object.assign({}, optionDefaults)
    const userMissingKey = 'customGatewayUrl'
    delete read[userMissingKey] // simulate the key not being in storage (eg. after extension update)
    const expectedChanges = {}
    expectedChanges[userMissingKey] = optionDefaults[userMissingKey]
    browser.storage.local.get.returns(Promise.resolve(read)) // simulate existing user data read from storage
    browser.storage.local.set.returns(Promise.resolve({}))
    storeMissingOptions(read, optionDefaults, browser.storage.local)
      .then(changes => {
        sinon.assert.calledWith(browser.storage.local.set, changes)
        expect(changes).to.be.deep.equal(expectedChanges)
        done()
      })
      .catch(error => { done(error) })
  })

  after(() => {
    browser.flush()
  })
})

describe('isHostname()', function () {
  it('should return false for invalid URL.hostname', () => {
    expect(isHostname('random text with whitespaces')).to.equal(false)
  })
  it('should return true for a valid URL.hostname (FQDN)', () => {
    expect(isHostname('example.com')).to.equal(true)
  })
  it('should return true for a valid URL.hostname (ipv4)', () => {
    expect(isHostname('192.168.1.1')).to.equal(true)
  })
  it('should return true for valid URL.hostname (ipv6 in brackets)', () => {
    expect(isHostname('[fe80::bb67:770c:8a97:1]')).to.equal(true)
  })
  it('should return false for invalid URL.hostname (ipv6 without brackets)', () => {
    expect(isHostname('fe80::bb67:770c:8a97:1')).to.equal(false)
  })
  it('should return false for ipv6 with a missing bracket', () => {
    expect(
      isHostname('[fe80::bb67:770c:8a97:1') ||
      isHostname('fe80::bb67:770c:8a97:1]')
    ).to.equal(false)
  })
  it('should return false for ipv6 with malformed brackets', () => {
    expect(isHostname('[fe80::bb67:770c:8a97]:1]')).to.equal(false)
  })
})

describe('hostTextToArray()', function () {
  it('should sort, dedup hostnames, drop non-FQDNs and produce an array', () => {
    const text = 'zombo.com\n TwO.com \n 192.168.1.1:58080 \n192.168.1.2\n[fe80::bb67:770c:8a97:1]:58080\nfe80::bb67:770c:8a97:2\n[fe80::bb67:770c:8a97:3]\n totally not a FQDN \none.pl \nTWO.com\n\n'
    const array = ['192.168.1.1', '192.168.1.2', '[fe80::bb67:770c:8a97:1]', '[fe80::bb67:770c:8a97:2]', '[fe80::bb67:770c:8a97:3]', 'one.pl', 'two.com', 'zombo.com']
    expect(hostTextToArray(text)).to.be.an('array').to.have.ordered.members(array)
  })
})

describe('hostArrayToText()', function () {
  it('should sort, deduplicate, drop non-FQDNs and produce multiline string', () => {
    const array = ['zombo.com ', 'two.com  ', 'ONE.pl ', 'one.pl', 'totall not a FQDN', 'zombo.com']
    const text = 'one.pl\ntwo.com\nzombo.com'
    expect(hostArrayToText(array)).to.be.a('string').equal(text)
  })
})
