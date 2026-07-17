'use strict'
import { afterAll as after, afterEach, beforeAll as before, beforeEach, describe, it } from 'vitest'
import browser from 'sinon-chrome'
import { URL } from 'url'
import createDnslinkResolver from '../../../add-on/src/lib/dnslink.js'
import { createIpfsPathValidator } from '../../../add-on/src/lib/ipfs-path.js'
import { createRequestModifier } from '../../../add-on/src/lib/ipfs-request.js'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
import { cleanupRules } from '../../../add-on/src/lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import isManifestV3, { manifestVersion } from '../../helpers/is-mv3-testing-enabled.js'
import { ensureCallRedirected, ensureNoRedirect } from '../../helpers/mv3-test-helper.js'

const cid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
const fakeRequestId = () => Math.floor(Math.random() * 100000).toString()

// A public IPFS path served by an unrelated website, so the request is a
// candidate for redirect to the local gateway regardless of its resource type.
const ipfsPathUrl = `https://google.com/ipfs/${cid}?argTest#hashTest`
const localGwExpectation = {
  MV2Expectation: `http://127.0.0.1:8080/ipfs/${cid}?argTest#hashTest`,
  MV3Expectation: {
    origin: '^https?\\:\\/\\/google\\.com\\/(ipfs|ipns)\\/',
    destination: 'http://127.0.0.1:8080/\\1/\\2'
  }
}

describe(`[${manifestVersion}] subresource redirects:`, function () {
  let state, dnslinkResolver, ipfsPathValidator, modifyRequest, runtime

  before(function () {
    global.URL = URL
    global.browser = browser
    browser.runtime.id = 'testid'
  })

  beforeEach(async function () {
    state = Object.assign(initState(optionDefaults), {
      ipfsNodeType: 'external',
      peerCount: 1,
      redirect: true,
      dnslinkPolicy: false,
      gwURLString: 'http://127.0.0.1:8080',
      pubGwURLString: 'https://ipfs.io'
    })
    const getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
  })

  afterEach(async function () {
    if (isManifestV3) {
      await cleanupRules(true)
    }
  })

  describe('with redirectSubresources off (default)', function () {
    it('redirects a top-level document navigation', async function () {
      const request = { url: ipfsPathUrl, type: 'main_frame' }
      // the DNR rule is scoped to main_frame only, so it cannot later catch
      // this host's subresources
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        ...localGwExpectation,
        resourceTypes: ['main_frame']
      })
    })
    it('does not redirect an embedded subresource (xmlhttprequest)', async function () {
      runtime.isFirefox = false
      const request = { url: ipfsPathUrl, type: 'xmlhttprequest', initiator: 'https://google.com/', requestId: fakeRequestId() }
      await ensureNoRedirect(modifyRequest, request)
    })
    it('does not redirect an embedded subresource (image)', async function () {
      const request = { url: ipfsPathUrl, type: 'image', initiator: 'https://google.com/', requestId: fakeRequestId() }
      await ensureNoRedirect(modifyRequest, request)
    })
    it('does not redirect an embedded subframe', async function () {
      const request = { url: ipfsPathUrl, type: 'sub_frame', initiator: 'https://google.com/', requestId: fakeRequestId() }
      await ensureNoRedirect(modifyRequest, request)
    })
  })

  describe('with redirectSubresources on', function () {
    beforeEach(function () {
      state.redirectSubresources = true
    })
    it('redirects an embedded subresource (xmlhttprequest)', async function () {
      runtime.isFirefox = false
      const request = { url: ipfsPathUrl, type: 'xmlhttprequest', initiator: 'https://www.nasa.gov/foo.html', requestId: fakeRequestId() }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        ...localGwExpectation
      })
    })
    it('redirects a top-level document navigation', async function () {
      const request = { url: ipfsPathUrl, type: 'main_frame' }
      ensureCallRedirected({
        modifiedRequestCallResp: await modifyRequest.onBeforeRequest(request),
        ...localGwExpectation
      })
    })
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
