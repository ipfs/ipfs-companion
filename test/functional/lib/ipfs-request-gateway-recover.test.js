'use strict'
import { assert } from 'chai'
import { afterAll as after, afterEach, beforeAll as before, beforeEach, describe, it } from 'vitest'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import { URL } from 'url'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'

browser.runtime.id = 'testid'

const url2request = (url, type = 'main_frame', tabId = new Date().valueOf()) => {
  return { url, type, tabId }
}
const urlRequestWithStatus = (url, statusCode = 200, type = 'main_frame') => {
  return { ...url2request(url, type), statusCode }
}

const urlRequestWithNetworkError = (url, error = 'net::ERR_CONNECTION_TIMED_OUT', type = 'main_frame') => {
  return { ...url2request(url, type), error }
}

const recoveryPageUrl = (nativeUri) =>
  `chrome-extension://testid/dist/recovery/recovery.html#${encodeURIComponent(nativeUri)}`

describe('requestHandler.onCompleted:', function () { // HTTP-level errors
  let state, dnslinkResolver, ipfsPathValidator, requestHandler, runtime

  before(function () {
    global.URL = URL
    browser.tabs = { ...browser.tabs, getCurrent: sinon.stub().resolves({ id: 20 }) }
    global.browser = browser
    browser.runtime.id = 'testid'
  })

  beforeEach(async function () {
    // defaults prefill both public gateways (ipfs.io and dweb.link)
    state = initState(optionDefaults)
    const getState = () => state
    const getIpfs = () => {}
    browser.runtime.getURL.returns('chrome-extension://testid/')
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    requestHandler = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('with recoverFailedHttpRequests=true', function () {
    beforeEach(function () {
      state.recoverFailedHttpRequests = true
      state.dnslinkLookup = false
    })
    it('should show recovery page when broken request is for the configured subdomain gateway and node is offline', async function () {
      // failures at the configured public gateway cannot recover to it; with
      // the node offline the user gets the recovery page with the native URI
      const request = urlRequestWithStatus('https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.dweb.link/wiki/', 500)
      await requestHandler.onCompleted(request)
      const expectedUrl = recoveryPageUrl('ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/wiki/')
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should open the recovery page')
    })
    it('should do nothing if broken subdomain request has Base58 CIDv0 label', async function () {
      // base58 is case-sensitive, so a CIDv0 lost in DNS lowercasing is not a
      // recognizable IPFS resource
      const request = urlRequestWithStatus('https://QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h.ipfs.dweb.link/wiki/', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should redirect to default subdomain gateway on broken subdomain gateway request', async function () {
      const request = urlRequestWithStatus('http://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.brokenexample.com/wiki/', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.dweb.link/wiki/', active: true }).calledOnce, 'tabs.update should be called with default subdomain gateway URL')
    })
    it('should do nothing if broken request is a non-IPFS request', async function () {
      const request = urlRequestWithStatus('https://wikipedia.org', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing if broken request is a local request to 127.0.0.1/ipfs', async function () {
      const request = urlRequestWithStatus('http://127.0.0.1:8080/ipfs/QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing if broken request is a local request to localhost/ipfs', async function () {
      const request = urlRequestWithStatus('http://localhost:8080/ipfs/QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing if broken request is a local request to *.ipfs.localhost', async function () {
      const request = urlRequestWithStatus('http://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhw.ipfs.localhost:8080/', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should show recovery page when broken request is to the configured path gateway and node is offline', async function () {
      const request = urlRequestWithStatus('https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      const expectedUrl = recoveryPageUrl('ipfs://bafybeieym3tecwcvjhnsbc3rfmxck4yimrggclrwd5fav5q44o7xo7n3ky')
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should open the recovery page')
    })
    it('should do nothing if broken request is not a \'main_frame\' request', async function () {
      const request = urlRequestWithStatus('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500, 'stylesheet')
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should recover from unreachable third party public gateway by reopening on the public gateway', async function () {
      const request = urlRequestWithStatus('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', active: true }).calledOnce, 'tabs.update should be called with IPFS default public gateway URL')
    })
  })

  describe('with recoverFailedHttpRequests=false', function () {
    beforeEach(function () {
      state.recoverFailedHttpRequests = false
      state.dnslinkLookup = false
    })
    it('should do nothing on failed subdomain gateway request', async function () {
      const request = urlRequestWithStatus('https://QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h.ipfs.brokendomain.com/wiki/', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing on broken non-default public gateway IPFS request', async function () {
      const request = urlRequestWithStatus('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 500)
      await requestHandler.onCompleted(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
  })

  afterEach(function () {
    browser.tabs.update.reset()
  })

  after(function () {
    delete global.url
    delete global.browser
    browser.flush()
  })
})

describe('requestHandler.onErrorOccurred:', function () { // network errors
  let state, dnslinkResolver, ipfsPathValidator, requestHandler, runtime

  before(function () {
    global.URL = URL
    browser.tabs = { ...browser.tabs, query: sinon.stub().resolves([{ id: 20 }]) }
    global.browser = browser
  })

  beforeEach(async function () {
    // defaults prefill both public gateways (ipfs.io and dweb.link)
    state = initState(optionDefaults)
    const getState = () => state
    const getIpfs = () => {}
    browser.runtime.getURL.returns('chrome-extension://testid/')
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // make it mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    requestHandler = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  describe('with recoverFailedHttpRequests=true', function () {
    beforeEach(function () {
      state.recoverFailedHttpRequests = true
      state.dnslinkLookup = false
    })
    it('should show recovery page when failed request is for the configured subdomain gateway and node is offline', async function () {
      const request = urlRequestWithStatus('https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.dweb.link/wiki/', 500)
      await requestHandler.onErrorOccurred(request)
      const expectedUrl = recoveryPageUrl('ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/wiki/')
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should open the recovery page')
    })
    it('should redirect to default subdomain gateway on failed subdomain gateway request', async function () {
      const request = urlRequestWithStatus('http://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.brokenexample.com/wiki/', 500)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.dweb.link/wiki/', active: true }).calledOnce, 'tabs.update should be called with default subdomain gateway URL')
    })
    it('should do nothing if failed request is a non-IPFS request', async function () {
      const request = urlRequestWithNetworkError('https://wikipedia.org')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing if failed request is a non-public IPFS request', async function () {
      const request = urlRequestWithNetworkError('http://127.0.0.1:8080/ipfs/QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should show recovery page when failed request is to the configured path gateway and node is offline', async function () {
      const request = urlRequestWithNetworkError('https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      const expectedUrl = recoveryPageUrl('ipfs://bafybeieym3tecwcvjhnsbc3rfmxck4yimrggclrwd5fav5q44o7xo7n3ky')
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should open the recovery page')
    })
    it('should do nothing if failed request is not a \'main_frame\' request', async function () {
      const requestType = 'stylesheet'
      const request = urlRequestWithNetworkError('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', 'net::ERR_NAME_NOT_RESOLVED', requestType)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should recover from unreachable third party public gateway by reopening on the public gateway', async function () {
      const request = urlRequestWithNetworkError('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'https://ipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', active: true }).calledOnce, 'tabs.update should be called with IPFS default public gateway URL')
    })
    it('should recover on the local gateway when no public gateway is configured and node is online', async function () {
      // clear the prefilled public gateways so recovery must use the local gateway
      Object.assign(state, { pubGwURL: undefined, pubGwURLString: undefined, pubSubdomainGwURL: undefined, pubSubdomainGwURLString: undefined, peerCount: 1 })
      const request = urlRequestWithNetworkError('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'http://localhost:8080/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h', active: true }).calledOnce, 'tabs.update should recover on the local gateway')
    })
    it('should show recovery page when no public gateway is configured and node is offline', async function () {
      Object.assign(state, { pubGwURL: undefined, pubGwURLString: undefined, pubSubdomainGwURL: undefined, pubSubdomainGwURLString: undefined })
      const request = urlRequestWithNetworkError('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      const expectedUrl = recoveryPageUrl('ipfs://bafybeieym3tecwcvjhnsbc3rfmxck4yimrggclrwd5fav5q44o7xo7n3ky')
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should open the recovery page')
    })
    it('should recover subdomain gateway request on the local gateway when no public subdomain gateway is configured and node is online', async function () {
      // a subdomain request is never downgraded to a public path gateway (it
      // lacks origin isolation); the local gateway preserves isolation via
      // its own redirect to *.ipfs.localhost
      Object.assign(state, { pubSubdomainGwURL: undefined, pubSubdomainGwURLString: undefined, peerCount: 1 })
      const request = urlRequestWithNetworkError('http://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.brokenexample.com/wiki/')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'http://localhost:8080/ipfs/bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/wiki/', active: true }).calledOnce, 'tabs.update should recover on the local gateway')
    })
    it('should recover path gateway request via the public subdomain gateway when only it is configured', async function () {
      Object.assign(state, { pubGwURL: undefined, pubGwURLString: undefined })
      const request = urlRequestWithNetworkError('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      // CIDv0 is normalized to a base32 CIDv1 subdomain label
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: 'https://bafybeieym3tecwcvjhnsbc3rfmxck4yimrggclrwd5fav5q44o7xo7n3ky.ipfs.dweb.link/', active: true }).calledOnce, 'tabs.update should recover on the public subdomain gateway')
    })
    it('should recover from unreachable HTTP server by reopening DNSLink on the active gateway', async function () {
      state.dnslinkLookup = true
      dnslinkResolver.setDnslink('en.wikipedia-on-ipfs.org', '/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco')
      // avoid DNS failures when recovering to local gateweay (if available)
      const expectedUrl = 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org/'
      const request = urlRequestWithNetworkError('https://en.wikipedia-on-ipfs.org/')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should be called with DNSLink on local gateway URL')
      dnslinkResolver.clearCache()
    })
    it('should recover from failed DNS for .eth opening it on EthDNS gateway at .eth.link', async function () {
      state.dnslinkLookup = true
      dnslinkResolver.setDnslink('almonit.eth', false)
      dnslinkResolver.setDnslink('almonit.eth.link', '/ipfs/QmPH7VMnfFKvrr7kLXNRwuxjYRLWnfcxPvnWs8ipyWAQK2')
      const dnsFailure = 'net::ERR_NAME_NOT_RESOLVED' // chrome code
      const expectedUrl = 'https://almonit.eth.link/'
      const request = urlRequestWithNetworkError('https://almonit.eth', dnsFailure)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.withArgs(request.tabId, { url: expectedUrl, active: true }).calledOnce, 'tabs.update should be called with ENS resource on local gateway URL')
      dnslinkResolver.clearCache()
    })
  })

  describe('with recoverFailedHttpRequests=false', function () {
    beforeEach(function () {
      state.recoverFailedHttpRequests = false
      state.dnslinkLookup = false
    })
    it('should do nothing on unreachable third party public gateway', async function () {
      const request = urlRequestWithNetworkError('https://nondefaultipfs.io/ipfs/QmYbZgeWE7y8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing on failed subdomain gateway request', async function () {
      const request = urlRequestWithStatus('https://QmYzZgeWE7r8HXkH8zbb8J9ddHQvp8LTqm6isL791eo14h.ipfs.brokendomain.com/wiki/', 500)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
    })
    it('should do nothing on unreachable HTTP server with DNSLink', async function () {
      state.dnslinkLookup = true
      dnslinkResolver.setDnslink('en.wikipedia-on-ipfs.org', '/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco')
      const request = urlRequestWithNetworkError('https://en.wikipedia-on-ipfs.org')
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
      dnslinkResolver.clearCache()
    })
    it('should do nothing on failed non-default public gateway IPFS request', async function () {
      state.dnslinkLookup = true
      dnslinkResolver.setDnslink('almonit.eth', false)
      dnslinkResolver.setDnslink('almonit.eth.link', '/ipfs/QmPH7VMnfFKvrr7kLXNRwuxjYRLWnfcxPvnWs8ipyWAQK2')
      const dnsFailure = 'net::ERR_NAME_NOT_RESOLVED' // chrome code
      const request = urlRequestWithNetworkError('https://almonit.eth', dnsFailure)
      await requestHandler.onErrorOccurred(request)
      assert.ok(browser.tabs.update.notCalled, 'tabs.update should not be called')
      dnslinkResolver.clearCache()
    })
  })

  afterEach(function () {
    browser.tabs.update.reset()
  })

  after(function () {
    delete global.url
    delete global.browser
    browser.flush()
  })
})
