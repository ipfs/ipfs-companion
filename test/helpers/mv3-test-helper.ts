import { expect } from 'chai'
import isMv3TestingEnabled from './is-mv3-testing-enabled'
import browser from 'sinon-chrome'
import { generateAddRule } from '../../add-on/src/lib/redirect-handler/blockOrObserve'

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
