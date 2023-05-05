import { expect } from 'chai'
import { before, describe, it } from 'mocha'
import browserMock from 'sinon-chrome'
import browser from 'webextension-polyfill'
import sinon from 'sinon'

import { optionDefaults } from '../../../../add-on/src/lib/options.js'
import { addRuleToDynamicRuleSetGenerator, isLocalHost } from '../../../../add-on/src/lib/redirect-handler/blockOrObserve'
import { initState } from '../../../../add-on/src/lib/state.js'

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
    'websocket',
    'webtransport',
    'xmlhttprequest'
  ]
})

describe('lib/redirect-handler/blockOrObserve', () => {
  before(function () {
    browserMock.runtime.id = 'testid'
  })

  describe('isLocalHost', () => {
    it('should return true for localhost', () => {
      expect(isLocalHost('http://localhost:8080')).to.be.true
      expect(isLocalHost('http://localhost:8080/ipfs/QmHash')).to.be.true
      expect(isLocalHost('http://127.0.0.1:8080/ipns/QmHash')).to.be.true
      expect(isLocalHost('http://[::1]:8080/ipfs/QmHash')).to.be.true
    })
  })

  describe('addRuleToDynamicRuleSetGenerator', () => {
    let addRuleToDynamicRuleSet
    let state
    let rulesSavedInMemory: browser.DeclarativeNetRequest.Rule[] = []
    let sinonSandbox

    before(() => {
      sinonSandbox = sinon.createSandbox()
      state = Object.assign(initState(optionDefaults), { peerCount: 1 })
      addRuleToDynamicRuleSet = addRuleToDynamicRuleSetGenerator(() => state)
      // https://github.com/acvetkov/sinon-chrome/issues/110
      browserMock.declarativeNetRequest = {
        updateDynamicRules: sinonSandbox.stub().resolves(),
        getDynamicRules: sinonSandbox.stub().resolves(new Proxy([], {
            get: (_target, prop) => {
              return rulesSavedInMemory[prop]
            }
          })
        )
      }
    })

    afterEach(() => {
      sinonSandbox.restore()
      rulesSavedInMemory = []
    })

    it('Should not redirect requests from localhost', () => {
      // when both redirectUrl and originUrl are same.
      addRuleToDynamicRuleSet({ originUrl: 'http://localhost:8080', redirectUrl: 'http://localhost:8080' })
      expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.false

      // when redirectUrl is different from originUrl, but both are localhost.
      addRuleToDynamicRuleSet({ originUrl: 'http://localhost:9001/foo', redirectUrl: 'http://localhost:9001/bar' })
      expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.false
    })

    it('Should allow pages to be recovered', () => {
      // when redirecting to recovery page
      addRuleToDynamicRuleSet({
        originUrl: 'http://localhost:8080',
        redirectUrl: 'chrome-extension://some-path/dist/recover/recovery.html'
      })
      expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.true
    })

    it('Should add redirect rules for local gateway', () => {
      addRuleToDynamicRuleSet({
        originUrl: 'https://ipfs.io/ipns/en.wikipedia-on-ipfs.org',
        redirectUrl: 'http://localhost:8080/ipns/en.wikipedia-on-ipfs.org'
      })
      expect(browserMock.declarativeNetRequest.updateDynamicRules.called).to.be.true
      const [{ addRules, removeRuleIds }] = browserMock.declarativeNetRequest.updateDynamicRules.firstCall.args
      // this is needed for the reconciliation logic to work. This is tested separately.
      rulesSavedInMemory = addRules
      expect(removeRuleIds).to.deep.equal([])
      expect(addRules).to.have.lengthOf(1)
      const [{ id, priority, action, condition }] = addRules
      expect(id).to.be.a('number')
      expect(priority).to.equal(1)
      expect(action).to.deep.equal({ type: 'redirect', redirect: { "regexSubstitution": "http://localhost:8080\\1" } })
      expect(condition).to.deep.equal(dynamicRulesConditions('^https?\\:\\/\\/ipfs\\.io((?:[^\\.]|$).*)$'))
    })
  })
})
