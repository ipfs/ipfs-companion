import { expect } from 'chai'
import Sinon from 'sinon'
import browser from 'sinon-chrome'
import { generateAddRule } from '../../add-on/src/lib/redirect-handler/blockOrObserve'
import isManifestV3 from './is-mv3-testing-enabled'
import { RULE_REGEX_ENDING } from '../../add-on/src/lib/redirect-handler/blockOrObserve'

/**
 * Ensure that the request is redirected
 *
 * @param modifiedRequestCallResp - Response from onBeforeRequest or onHeadersReceived
 * @param MV2Expectation - Expected redirect URL for Manifest V2
 * @param MV3Expectation - Expected redirect URL for Manifest V3
 * @param MV3Expectation.origin - Expected origin URL for Manifest V3
 * @param MV3Expectation.destination - Expected destination URL for Manifest V3
 */
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
}): void {
  if (isManifestV3) {
    const [args] = browser.declarativeNetRequest.updateDynamicRules.firstCall.args
    expect(args.addRules[0]).to.deep.equal(generateAddRule(
      args.addRules[0].id,
      MV3Expectation.origin + RULE_REGEX_ENDING,
      MV3Expectation.destination
    ))
  } else {
    expect(modifiedRequestCallResp.redirectUrl).to.equal(MV2Expectation)
  }
}

/**
 * Ensure that the request is not touched
 *
 * @param resp - Response from onBeforeRequest or onHeadersReceived
 */
export function ensureRequestUntouched (resp): void {
  if (isManifestV3) {
    Sinon.assert.notCalled(browser.declarativeNetRequest.updateDynamicRules)
  } else {
    expect(resp).to.equal(undefined)
  }
}

/**
 * Execute webRequest stages in order and ensure that the request
 * is not redirected by any of them
 *
 * @param modifyRequest - Request Modifier
 * @param request - Request to be modified
 */
export async function ensureNoRedirect (modifyRequest, request): Promise<void> {
  // check webRequest stages sequentially in the same order a browser would
  // (each stage may modify state and must be inspected idependently, in order)
  await ensureRequestUntouched(await modifyRequest.onBeforeRequest(request))
  await ensureRequestUntouched(await modifyRequest.onHeadersReceived(request))
}
