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
import { cleanupRules, generateAddRule, RULE_REGEX_ENDING } from '../../../add-on/src/lib/redirect-handler/blockOrObserve.js'
import createRuntimeChecks from '../../../add-on/src/lib/runtime-checks.js'
import { initState } from '../../../add-on/src/lib/state.js'
import isManifestV3, { manifestVersion } from '../../helpers/is-mv3-testing-enabled.js'

// A DNSLink record value; lateDnslinkRedirect only cares that it is truthy, the
// target is always /ipns/<host> derived from the request URL.
const dnslinkRecord = '/ipfs/QmbfimSwTuCvGL8XBr3yk1iCjqgk2co2n21cWmcQohymDd'
const siteUrl = 'http://explore.ipld.io/index.html?argTest#hashTest'

describe(`[${manifestVersion}] late DNSLink redirect (first-load upgrade):`, function () {
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
      redirectSubresources: true, // so the MV3 rule uses the full resourceTypes set
      dnslinkLookup: true,
      dnslinkRedirect: true,
      gwURLString: 'http://127.0.0.1:8080',
      pubGwURLString: 'https://ipfs.io'
    })
    const getState = () => state
    const getIpfs = () => {}
    dnslinkResolver = createDnslinkResolver(getState)
    runtime = Object.assign({}, await createRuntimeChecks(browser)) // mutable for tests
    ipfsPathValidator = createIpfsPathValidator(getState, getIpfs, dnslinkResolver)
    modifyRequest = createRequestModifier(getState, dnslinkResolver, ipfsPathValidator, runtime)
    browser.tabs.update = sinon.stub().resolves()
    browser.tabs.query = sinon.stub().resolves([{ id: 40 }])
  })

  afterEach(async function () {
    if (isManifestV3) {
      await cleanupRules(true)
    }
  })

  const mainFrameRequest = (over = {}) => ({ url: siteUrl, type: 'main_frame', method: 'GET', tabId: 40, ...over })

  // the tab ends up at the mutable /ipns/ address of the site, on the local gateway
  const expectUpgraded = () => {
    if (isManifestV3) {
      const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
      expect(args.addRules[0]).to.deep.equal(generateAddRule(
        args.addRules[0].id,
        '^https?\\:\\/\\/explore\\.ipld\\.io' + RULE_REGEX_ENDING,
        `${state.gwURLString}/ipns/explore.ipld.io\\1`
      ))
    } else {
      expect(browser.tabs.update.calledOnce).to.equal(true)
      expect(browser.tabs.update.firstCall.args[1].url).to.equal(`${state.gwURLString}/ipns/explore.ipld.io/index.html?argTest#hashTest`)
    }
  }

  const expectNotUpgraded = () => {
    if (isManifestV3) {
      sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
    } else {
      sinon.assert.notCalled(browser.tabs.update)
    }
  }

  it('upgrades a main_frame tab to the /ipns/ address once the lookup confirms a DNSLink', async function () {
    await modifyRequest.lateDnslinkRedirect(mainFrameRequest(), dnslinkRecord)
    expectUpgraded()
  })
  it('does nothing when the lookup found no DNSLink', async function () {
    await modifyRequest.lateDnslinkRedirect(mainFrameRequest(), false)
    expectNotUpgraded()
  })
  it('does nothing for a non-main_frame request', async function () {
    await modifyRequest.lateDnslinkRedirect(mainFrameRequest({ type: 'sub_frame' }), dnslinkRecord)
    expectNotUpgraded()
  })
  it('does nothing for a non-GET navigation', async function () {
    await modifyRequest.lateDnslinkRedirect(mainFrameRequest({ method: 'POST' }), dnslinkRecord)
    expectNotUpgraded()
  })
  it('does nothing when dnslinkRedirect is disabled', async function () {
    state.dnslinkRedirect = false
    await modifyRequest.lateDnslinkRedirect(mainFrameRequest(), dnslinkRecord)
    expectNotUpgraded()
  })
  it('does nothing when DNSLink lookups are off (dnslinkLookup off)', async function () {
    state.dnslinkLookup = false
    await modifyRequest.lateDnslinkRedirect(mainFrameRequest(), dnslinkRecord)
    expectNotUpgraded()
  })

  after(function () {
    delete global.URL
    delete global.browser
    browser.flush()
  })
})
