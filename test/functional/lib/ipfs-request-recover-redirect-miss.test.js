'use strict'
import { expect } from 'chai'
import { afterAll as after, afterEach, beforeAll as before, beforeEach, describe, it } from 'vitest'
import sinon from 'sinon'
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

// A service worker gateway (e.g. inbrowser.link) can serve the navigation from
// its own cache, so the redirect to the local gateway never happens at the
// network layer. recoverRedirectMiss catches the committed navigation and sends
// the tab to the local gateway with tabs.update, in both MV2 and MV3.
const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const swGatewayUrl = `https://${cid}.ipfs.inbrowser.link/`
// the local gateway then upgrades this path form to the isolated subdomain origin
const localUrl = `http://localhost:8080/ipfs/${cid}/`

describe(`[${manifestVersion}] recoverRedirectMiss (service worker gateway fixup):`, function () {
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
      gwURLString: 'http://localhost:8080',
      gwURL: new URL('http://localhost:8080'),
      pubGwURLString: 'https://ipfs.io',
      pubGwURL: new URL('https://ipfs.io'),
      pubSubdomainGwURLString: 'https://dweb.link',
      pubSubdomainGwURL: new URL('https://dweb.link')
    })
    const getState = () => state
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, () => {}, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
    browser.tabs.update = sinon.stub().resolves()
  })

  afterEach(async function () {
    if (isManifestV3) {
      await cleanupRules(true)
    }
  })

  const commit = (over = {}) => ({ url: swGatewayUrl, frameId: 0, tabId: 40, transitionQualifiers: [], ...over })

  const expectRecoveredTo = (url) => {
    expect(browser.tabs.update.calledOnce).to.equal(true)
    expect(browser.tabs.update.firstCall.args).to.deep.equal([40, { active: true, url }])
  }
  const expectUntouched = () => sinon.assert.notCalled(browser.tabs.update)

  it('reclaims a committed public gateway navigation to the local gateway', async function () {
    await modifyRequest.recoverRedirectMiss(commit())
    expectRecoveredTo(localUrl)
  })
  it('does nothing for a sub-frame navigation', async function () {
    await modifyRequest.recoverRedirectMiss(commit({ frameId: 1 }))
    expectUntouched()
  })
  it('honors the ?x-ipfs-companion-no-redirect opt-out', async function () {
    await modifyRequest.recoverRedirectMiss(commit({ url: `${swGatewayUrl}?x-ipfs-companion-no-redirect` }))
    expectUntouched()
  })
  it('does nothing on a Back/Forward navigation (avoids trapping Back)', async function () {
    await modifyRequest.recoverRedirectMiss(commit({ transitionQualifiers: ['forward_back'] }))
    expectUntouched()
  })
  it('does nothing when redirect is disabled', async function () {
    state.redirect = false
    await modifyRequest.recoverRedirectMiss(commit())
    expectUntouched()
  })
  it('does nothing when the site is opted out per-site', async function () {
    state.disabledOn = ['inbrowser.link']
    await modifyRequest.recoverRedirectMiss(commit())
    expectUntouched()
  })
  it('does nothing when already at the local gateway', async function () {
    await modifyRequest.recoverRedirectMiss(commit({ url: localUrl }))
    expectUntouched()
  })
  it('does nothing for a non-IPFS page', async function () {
    await modifyRequest.recoverRedirectMiss(commit({ url: 'https://example.com/' }))
    expectUntouched()
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
