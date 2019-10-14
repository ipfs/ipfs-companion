'use strict'
const { describe, it, before, beforeEach, after, afterEach } = require('mocha')
const sinon = require('sinon')
const { assert } = require('chai')
const { URL } = require('url')
const browser = require('sinon-chrome')
const { initState } = require('../../../add-on/src/lib/state')
const { createRuntimeChecks } = require('../../../add-on/src/lib/runtime-checks')
const { createRequestModifier } = require('../../../add-on/src/lib/ipfs-request')
const createDnslinkResolver = require('../../../add-on/src/lib/dnslink')
const { createIpfsPathValidator } = require('../../../add-on/src/lib/ipfs-path')
const { optionDefaults } = require('../../../add-on/src/lib/options')

const url2request = (url, type = 'main_frame') => {
  return { url, type }
}
const urlRequestWithStatus = (url, statusCode = 200, type = 'main_frame') => {
  return { ...url2request(url, type), statusCode }
}

describe('requestHandler.onCompleted:', function () {
  let state, dnslinkResolver, ipfsPathValidator, requestHandler, runtime

  before(function () {
    global.URL = URL
    browser.tabs = { ...browser.tabs, query: sinon.stub().resolves([{ id: 20 }]) }
    global.browser = browser
  })

  beforeEach(async function () {
    state = initState(optionDefaults)
    const getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    requestHandler = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('with recoverViaPublicGateway=true', function () {
    beforeEach(function () {
      state.recoverViaPublicGateway = true
    })
    it('should do nothing if broken request is a non-IPFS request', async function () {
      const request = urlRequestWithStatus('https://ipfs.io', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should do nothing if broken request is a non-public IPFS request', async function () {
      const request = urlRequestWithStatus('http://127.0.0.1:8080/ipfs/QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should do nothing if broken request is to the default public gateway', async function () {
      const request = urlRequestWithStatus('https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should do nothing if broken request is not a \'main_frame\' request', async function () {
      const request = urlRequestWithStatus('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500, 'non_main_frame')
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should redirect broken non-default public gateway IPFS request to public gateway', async function () {
      const request = urlRequestWithStatus('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.create.withArgs({ url: 'https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', active: true, openerTabId: 20 }).calledOnce, 'tabs.create should be called with IPFS default public gateway URL')
    })
  })

  describe('with recoverViaPublicGateway=false', function () {
    beforeEach(function () {
      state.recoverViaPublicGateway = false
    })
    it('should do nothing on broken non-default public gateway IPFS request', async function () {
      const request = urlRequestWithStatus('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
  })

  afterEach(function () {
    browser.tabs.create.reset()
  })

  after(function () {
    delete global.url
    delete global.browser
    browser.flush()
  })
})

describe('requestHandler.onErrorOccurred:', function () {
  let state, dnslinkResolver, ipfsPathValidator, requestHandler, runtime

  before(function () {
    global.URL = URL
    browser.tabs = { ...browser.tabs, query: sinon.stub().resolves([{ id: 20 }]) }
    global.browser = browser
  })

  beforeEach(async function () {
    state = initState(optionDefaults)
    const getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    requestHandler = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('with recoverViaPublicGateway=true', function () {
    beforeEach(function () {
      state.recoverViaPublicGateway = true
    })
    it('should do nothing if failed request is a non-IPFS request', async function () {
      const request = url2request('https://wikipedia.org', 500)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should do nothing if failed request is a non-public IPFS request', async function () {
      const request = url2request('http://127.0.0.1:8080/ipfs/QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should do nothing if failed request is to the default public gateway', async function () {
      const request = url2request('https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should do nothing if failed request is not a \'main_frame\' request', async function () {
      const request = url2request('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 'non_main_frame')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
    it('should redirect failed non-default public gateway IPFS request to public gateway', async function () {
      const request = url2request('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.create.withArgs({ url: 'https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', active: true, openerTabId: 20 }).calledOnce, 'tabs.create should be called with IPFS default public gateway URL')
    })
  })

  describe('with recoverViaPublicGateway=false', function () {
    beforeEach(function () {
      state.recoverViaPublicGateway = false
    })
    it('should do nothing on failed non-default public gateway IPFS request', async function () {
      const request = url2request('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.create.notCalled, 'tabs.create should not be called')
    })
  })

  afterEach(function () {
    browser.tabs.create.reset()
  })

  after(function () {
    delete global.url
    delete global.browser
    browser.flush()
  })
})
