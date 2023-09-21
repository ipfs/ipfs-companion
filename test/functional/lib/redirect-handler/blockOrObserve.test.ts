import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import sinon from 'sinon';
import browserMock from 'sinon-chrome';

import { optionDefaults } from '../../../../add-on/src/lib/options.js';
import { RULE_REGEX_ENDING, addRuleToDynamicRuleSetGenerator, cleanupRules, isLocalHost } from '../../../../add-on/src/lib/redirect-handler/blockOrObserve';
import { initState } from '../../../../add-on/src/lib/state.js';
import isManifestV3 from '../../../helpers/is-mv3-testing-enabled';
import DeclarativeNetRequestMock from './declarativeNetRequest.mock.js';

const dynamicRulesConditions = (regexFilter) => ({
  regexFilter,
  excludedInitiatorDomains: [],
  resourceTypes: [
    'csp_report',
    'font',
    'image',
    'main_frame',
    'media',
    'object',
    'other',
    'ping',
    'script',
    'stylesheet',
    'sub_frame',
    'webbundle',
    'xmlhttprequest'
  ]
})

/**
 * Ensures that the tab is redirected to the given url on the first request.
 *
 * @param url
 */
function ensureTabUpdatedTo (url): void {
  expect(browserMock.tabs.query.called).to.be.true
  expect(browserMock.tabs.update.called).to.be.true
  expect(browserMock.tabs.update.lastCall.args).to.deep.equal([40, { url }])
}

/**
 * Ensures that the declarativeNetRequest API is called with the expected rule.
 * @param expectedCondition
 * @param regexSubstitution
 */
function ensureDeclarativeNetRequestRuleIsAdded ({
  addRuleIndex = 0,
  addRuleLength = 1,
  callIndex = 0,
  expectedCondition,
  regexSubstitution,
  removedRulesIds = [],
}: {
  addRuleIndex?: number
  addRuleLength?: number
  callIndex?: number
  expectedCondition: string
  regexSubstitution: string
  removedRulesIds?: number[]
}): void {
  if (callIndex < 0) {
    callIndex = browserMock.declarativeNetRequest.updateDynamicRules.getCalls().length + callIndex
  }
  expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.true
  const [{ addRules, removeRuleIds }] = browserMock.declarativeNetRequest.updateDynamicRules.getCall(callIndex).args
  expect(removeRuleIds).to.deep.equal(removedRulesIds)
  if (addRuleLength > 0) {
    expect(addRules).to.have.lengthOf(addRuleLength)
    const { id, priority, action, condition } = addRules[addRuleIndex]
    expect(id).to.be.a('number')
    expect(priority).to.equal(1)
    expect(action).to.deep.equal({ type: 'redirect', redirect: { regexSubstitution } })
    expect(condition).to.deep.equal(dynamicRulesConditions(expectedCondition))
  }
}

describe('lib/redirect-handler/blockOrObserve', () => {
  before(function () {
    if (!isManifestV3) {
      return this.skip()
    }
    browserMock.runtime.id = 'testid'
  })

  describe('isLocalHost', () => {
    it('should return true for localhost', () => {
      expect(isLocalHost('http://[::1]:8080/ipfs/QmHash')).to.be.true
      expect(isLocalHost('http://[::1]:8080/ipfs/QmHash')).to.be.true
      expect(isLocalHost('http://127.0.0.1:8080/ipns/QmHash')).to.be.true
      expect(isLocalHost('http://127.0.0.1:8080/ipns/QmHash')).to.be.true
      expect(isLocalHost('http://ipfs.tech')).to.be.false
      expect(isLocalHost('http://localhost:8080')).to.be.true
      expect(isLocalHost('http://localhost:8080')).to.be.true
      expect(isLocalHost('http://localhost:8080')).to.be.true
      expect(isLocalHost('http://localhost:8080/ipfs/QmHash')).to.be.true
      expect(isLocalHost('http://localhost:8080/ipfs/QmHash')).to.be.true
      expect(isLocalHost('http://localhost')).to.be.true
      expect(isLocalHost('https://google.com')).to.be.false
      expect(isLocalHost('https://ipfs.io')).to.be.false
    })
  })

  describe('addRuleToDynamicRuleSetGenerator', () => {
    let addRuleToDynamicRuleSet
    let state
    let sinonSandbox

    before(() => {
      sinonSandbox = sinon.createSandbox()
      state = Object.assign(initState(optionDefaults), { peerCount: 1 })
      addRuleToDynamicRuleSet = addRuleToDynamicRuleSetGenerator(() => state)
    })

    beforeEach(async () => {
      sinonSandbox.restore()
      browserMock.tabs.query.resetHistory()
      browserMock.tabs.update.resetHistory()
      browserMock.declarativeNetRequest = sinonSandbox.spy(new DeclarativeNetRequestMock())
      // this cleans up the rules from the previous test stored in memory.
      await cleanupRules(true)
      // this is just to reset the call count.
      browserMock.declarativeNetRequest = sinonSandbox.spy(new DeclarativeNetRequestMock())
    })

    it('Should not redirect requests from localhost', async () => {
      // when both redirectUrl and originUrl are same.
      await addRuleToDynamicRuleSet({ originUrl: 'http://localhost:8080', redirectUrl: 'http://localhost:8080' })
      expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.false

      // when redirectUrl is different from originUrl, but both are localhost.
      await addRuleToDynamicRuleSet({ originUrl: 'http://localhost:9001/foo', redirectUrl: 'http://localhost:9001/bar' })

      // when originUrl is a valid IPFS URL.
      await addRuleToDynamicRuleSet({ originUrl: 'http://localhost:8080/ipfs/bafkqaaa', redirectUrl: 'http://localhost:9001/bar' })

      expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.false
      expect (browserMock.tabs.query.called).to.be.false
    })

    it('Should add default rules for localhost', async () => {
      await addRuleToDynamicRuleSet({
        originUrl: 'https://ipfs.io/ipns/en.wikipedia-on-ipfs.org',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org'
      })

      ensureDeclarativeNetRequestRuleIsAdded({
        addRuleIndex: 0,
        addRuleLength: 3,
        callIndex: 1,
        expectedCondition: `^http\\:\\/\\/127\\.0\\.0\\.1\\:8080\\/(ipfs|ipns)\\/${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080/\\1/\\2'
      })

      ensureDeclarativeNetRequestRuleIsAdded({
        addRuleIndex: 1,
        addRuleLength: 3,
        callIndex: 1,
        expectedCondition: `^http\\:\\/\\/\\[\\:\\:1\\]\\:8080\\/(ipfs|ipns)\\/${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080/\\1/\\2'
      })

      ensureDeclarativeNetRequestRuleIsAdded({
        addRuleIndex: 2,
        addRuleLength: 3,
        callIndex: 1,
        expectedCondition: `^http\\:\\/\\/localhost\\:5001\\/(ipfs|ipns)\\/${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://127.0.0.1:5001/\\1/\\2'
      })
    })

    it('Should allow pages to be recovered', async () => {
      // when redirecting to recovery page
      await addRuleToDynamicRuleSet({
        originUrl: 'http://localhost:8080',
        redirectUrl: 'chrome-extension://some-path/dist/recover/recovery.html'
      })
      ensureTabUpdatedTo('chrome-extension://some-path/dist/recover/recovery.html')
      ensureDeclarativeNetRequestRuleIsAdded({
        expectedCondition: `^https?\\:\\/\\/localhost\\:8080${RULE_REGEX_ENDING}`,
        regexSubstitution: 'chrome-extension://some-path/dist/recover/recovery.html\\1',
      })
    })

    it('Should update tab from originUrl to redirectUrl for the first time', async () => {
      await addRuleToDynamicRuleSet({
        originUrl: 'https://ipfs.io/ipns/en.wikipedia-on-ipfs.org',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org'
      })
      expect(browserMock.tabs.query.called).to.be.true
      expect(browserMock.tabs.update.called).to.be.true
      expect(browserMock.tabs.update.lastCall.args).to.deep.equal([40, { url: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org' }])
    })

    it('Should wait for the tab to exist before updating tab from originUrl to redirectUrl for the first time', async () => {
      const clock = sinon.useFakeTimers();
      browserMock.tabs.query.onCall(0).resolves([])
      browserMock.tabs.query.onCall(1).resolves([{ id: 40 }])
      await addRuleToDynamicRuleSet({
        originUrl: 'https://ipfs.io/ipns/en.wikipedia-on-ipfs.org',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org'
      })
      await clock.tickAsync(400)
      expect(browserMock.tabs.query.callCount).to.be.equal(2)
      expect(browserMock.tabs.update.called).to.be.true
      expect(browserMock.tabs.update.lastCall.args).to.deep.equal([40, { url: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org' }])
    })

    it('Should add redirect rules for local gateway', async () => {
      await addRuleToDynamicRuleSet({
        originUrl: 'https://ipfs.io/ipns/en.wikipedia-on-ipfs.org',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org'
      })
      ensureTabUpdatedTo('http://localhost:8080/ipns/en.wikipedia-on-ipfs.org')
      ensureDeclarativeNetRequestRuleIsAdded({
        expectedCondition: `^https?\\:\\/\\/ipfs\\.io\\/(ipfs|ipns)\\/${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080/\\1/\\2'
      })
    })

    it('Should add redirect for local gateway where originUrl is similar to redirectUrl', async () => {
      await addRuleToDynamicRuleSet({
        originUrl: 'https://docs.ipfs.tech',
        redirectUrl: 'http://localhost:8080/ipns/docs.ipfs.tech'
      })
      ensureTabUpdatedTo('http://localhost:8080/ipns/docs.ipfs.tech')
      ensureDeclarativeNetRequestRuleIsAdded({
        expectedCondition: `^https?\\:\\/\\/docs\\.ipfs\\.tech${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080/ipns/docs.ipfs.tech\\1'
      })
    })

    it('Should add redirect for local gateway where originUrl is similar to redirectUrl and is not https', async () => {
      await addRuleToDynamicRuleSet({
        originUrl: 'http://docs.ipfs.tech',
        redirectUrl: 'http://localhost:8080/ipns/docs.ipfs.tech'
      })
      ensureTabUpdatedTo('http://localhost:8080/ipns/docs.ipfs.tech')
      ensureDeclarativeNetRequestRuleIsAdded({
        expectedCondition: `^https?\\:\\/\\/docs\\.ipfs\\.tech${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080/ipns/docs.ipfs.tech\\1'
      })
    })

    it('Should remove the old rule when redirect changes for local gateway', async () => {
      await addRuleToDynamicRuleSet({
        originUrl: 'http://docs.ipfs.tech',
        redirectUrl: 'http://localhost:8080/ipns/docs.ipfs.tech'
      })
      ensureTabUpdatedTo('http://localhost:8080/ipns/docs.ipfs.tech')
      ensureDeclarativeNetRequestRuleIsAdded({
        expectedCondition: `^https?\\:\\/\\/docs\\.ipfs\\.tech${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080/ipns/docs.ipfs.tech\\1'
      })
      const [{ addRules }] = browserMock.declarativeNetRequest.updateDynamicRules.firstCall.args

      await browserMock.declarativeNetRequest.updateDynamicRules.resetHistory()
      // assuming the localhost changed or the redirectURL changed.
      await addRuleToDynamicRuleSet({
        originUrl: 'http://docs.ipfs.tech',
        redirectUrl: 'http://localhost:8081/ipns/docs.ipfs.tech'
      })
      ensureTabUpdatedTo('http://localhost:8081/ipns/docs.ipfs.tech')
      ensureDeclarativeNetRequestRuleIsAdded({
        expectedCondition: `^https?\\:\\/\\/docs\\.ipfs\\.tech${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8081/ipns/docs.ipfs.tech\\1',
        removedRulesIds: [addRules[0].id]
      })
    })

    it('Should remove the old rules when companion is no longer in active state', async () => {
      // first redirect
      const getRuleIdsAddedSoFar = () => browserMock.declarativeNetRequest.updateDynamicRules.getCalls().map(({args}) => args[0]?.addRules.map(rule => rule.id).flat()).flat()

      await addRuleToDynamicRuleSet({
        originUrl: 'http://docs.ipfs.tech',
        redirectUrl: 'http://localhost:8080/ipns/docs.ipfs.tech'
      })

      await addRuleToDynamicRuleSet({
        originUrl: 'http://awesome.ipfs.io',
        redirectUrl: 'http://localhost:8080/ipns/awesome.ipfs.io'
      })

      state.active = false
      await addRuleToDynamicRuleSet({
        originUrl: 'https://ipfs.io/ipns/en.wikipedia-on-ipfs.org',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org'
      })

      ensureTabUpdatedTo('http://localhost:8080/ipns/en.wikipedia-on-ipfs.org')
      ensureDeclarativeNetRequestRuleIsAdded({
        addRuleLength: 0,
        callIndex: -1,
        expectedCondition: `^https?\\:\\/\\/ipfs\\.io${RULE_REGEX_ENDING}`,
        regexSubstitution: 'http://localhost:8080\\1',
        removedRulesIds: getRuleIdsAddedSoFar()
      })

    })
  })
})
