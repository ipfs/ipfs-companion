import { expect } from 'chai'
import Sinon from 'sinon'
import browser from 'sinon-chrome'
import { generateAddRule } from '../../add-on/src/lib/redirect-handler/blockOrObserve'
import isMv3TestingEnabled from './is-mv3-testing-enabled'

export const regexRuleEnding = '((?:[^\\.]|$).*)$'

export function ensureCallRedirected ({
  modifiedRequestCallResp,
  MV2Expectation,
  MV3Expectation
}: {
  modifiedRequestCallResp: { redirectUrl: string },
  MV2Expectation: string,
  MV3Expectation: {
    origin: string,
    destination: string
  }
}) {
  if (isMv3TestingEnabled) {
    const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
    expect(args.addRules[0]).to.deep.equal(generateAddRule(
      args.addRules[0].id,
      MV3Expectation.origin + regexRuleEnding,
      MV3Expectation.destination + '\\1'
    ))
  } else {
    expect(modifiedRequestCallResp.redirectUrl).to.equal(MV2Expectation)
  }
}

export function ensureRequestUntouched (resp): void {
  if (isMv3TestingEnabled) {
    Sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
  } else {
    expect(resp).to.equal(undefined)
  }
}

export async function expectNoRedirect (modifyRequest, request, browser): Promise<void> {
  if (isMv3TestingEnabled) {
    await modifyRequest.onBeforeRequest(request)
    Sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
    await modifyRequest.onHeadersReceived(request)
    Sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
  } else {
    expect(await modifyRequest.onBeforeRequest(request)).to.equal(undefined)
    expect(await modifyRequest.onHeadersReceived(request)).to.equal(undefined)
  }
}
