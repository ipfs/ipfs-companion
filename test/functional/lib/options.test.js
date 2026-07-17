'use strict'
import { describe, it, beforeEach, afterAll as after } from 'vitest'
import { expect } from 'chai'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import { storeMissingOptions, optionDefaults, guiURLString, isHostname, hostTextToArray, hostArrayToText } from '../../../add-on/src/lib/options.js'
import { URL } from 'url'

describe('optionDefaults', function () {
  // Fresh installs share links via the public subdomain gateway; flipping the
  // default to native URIs means changing the DEFAULT_* constants in
  // options.js and this test together.
  it('should prefill public gateways and share via them by default', () => {
    expect(optionDefaults.publicGatewayUrl).to.equal('https://ipfs.io')
    expect(optionDefaults.publicSubdomainGatewayUrl).to.equal('https://dweb.link')
    expect(optionDefaults.usePublicGatewaysForShare).to.equal(true)
  })
})

describe('guiURLString()', function () {
  beforeEach(() => {
    global.URL = URL
  })
  it('should normalize URL and drop trailing slash', () => {
    expect(guiURLString('https://ipfs.io/')).to.equal('https://ipfs.io')
  })
  // clearing a public gateway URL in Preferences stores '' to opt out of it
  it('should keep empty input empty', () => {
    expect(guiURLString('')).to.equal('')
  })
})

describe('storeMissingOptions()', function () {
  beforeEach(() => {
    global.URL = URL
    browser.runtime.id = 'testid'
    browser.flush()
  })

  it('should save all defaults during first run when no value is present in storage', () => {
    browser.storage.local.get.returns(Promise.resolve({})) // simulates empty user storage (clean install)
    browser.storage.local.set.returns(Promise.resolve({}))
    const read = Object.assign({}, optionDefaults)
    return storeMissingOptions(read, optionDefaults, browser.storage.local)
      .then(changes => {
        sinon.assert.calledWith(browser.storage.local.set, changes)
        expect(changes).to.be.deep.equal(optionDefaults)
      })
  })
  it('should not touch non-default value present in storage', () => {
    const read = Object.assign({}, optionDefaults)
    const userModifiedKey = 'linkify'
    read[userModifiedKey] = !optionDefaults[userModifiedKey] // simulate custom option set by user
    browser.storage.local.get.returns(Promise.resolve(read)) // simulate existing user data read from storage
    browser.storage.local.set.returns(Promise.resolve({}))
    return storeMissingOptions(read, optionDefaults, browser.storage.local)
      .then(changes => {
        sinon.assert.calledWith(browser.storage.local.set, changes)
        expect(changes).to.be.deep.equal({})
      })
  })

  it('should initialize default value for key missing from both read options and storage', () => {
    const read = Object.assign({}, optionDefaults)
    const userMissingKey = 'customGatewayUrl'
    delete read[userMissingKey] // simulate the key not being in storage (eg. after extension update)
    const expectedChanges = {}
    expectedChanges[userMissingKey] = optionDefaults[userMissingKey]
    browser.storage.local.get.returns(Promise.resolve(read)) // simulate existing user data read from storage
    browser.storage.local.set.returns(Promise.resolve({}))
    return storeMissingOptions(read, optionDefaults, browser.storage.local)
      .then(changes => {
        sinon.assert.calledWith(browser.storage.local.set, changes)
        expect(changes).to.be.deep.equal(expectedChanges)
      })
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
