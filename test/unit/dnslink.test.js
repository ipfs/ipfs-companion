'use strict'
/* eslint-env webextensions, mocha */
// eslint-disable-next-line no-unused-vars
/* globals sinon, initStates, optionDefaults, should, state, redirectToIpnsPath, URL */

var sandbox

// https://github.com/ipfs/ipfs-companion/issues/303
describe('DNSLINK', function () {
  beforeEach(() => {
    browser.flush()
    sandbox = sinon.sandbox.create()
    browser.storage.local.get.returns(Promise.resolve(optionDefaults))
    // reset states
    initStates(optionDefaults)
    // stub default state for most of tests
    // redirect by default -- makes test code shorter
    state.peerCount = 1
    state.redirect = true
    state.catchUnhandledProtocols = true
    state.gwURLString = 'http://127.0.0.1:8080'
  })

  afterEach(() => {
    sandbox.restore()
    browser.flush()
  })

  describe('redirectToIpnsPath(url)', function () {
    it('should return IPNS path at a custom gateway', function () {
      const url = new URL('http://ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
      redirectToIpnsPath(url).redirectUrl.should.equal('http://127.0.0.1:8080/ipns/ipfs.git.sexy/sketches/ipld_intro.html?a=b#c=d')
    })
  })
})
