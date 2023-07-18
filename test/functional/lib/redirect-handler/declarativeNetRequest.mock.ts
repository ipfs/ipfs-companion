import browser from 'webextension-polyfill'

/**
 * https://github.com/acvetkov/sinon-chrome/issues/110
 *
 * Since this is not implemented in sinon-chrome, this is a bare-bones mock implementation.
 * This still needs to be instrumented in sinon, to be able to assert on calls.
 */
class DeclarativeNetRequestMock implements browser.DeclarativeNetRequest.Static {
  private dynamicRules: Map<number, browser.DeclarativeNetRequest.Rule>;
  private sessionRules: Map<number, browser.DeclarativeNetRequest.Rule>;

  constructor() {
    this.dynamicRules = new Map()
    this.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES = 5000
  }

  async getDynamicRules(): Promise<browser.DeclarativeNetRequest.Rule[]> {
    return [...this.dynamicRules.values()]
  }

  async updateDynamicRules({
    addRules,
    removeRuleIds
  }: browser.DeclarativeNetRequest.UpdateDynamicRulesOptionsType): Promise<void> {
    if (removeRuleIds && addRules) {
      removeRuleIds.forEach(id => this.dynamicRules.delete(id))
      addRules.forEach(rule => this.dynamicRules.set(rule.id, rule))
    }
  }

  async updateSessionRules({
    addRules,
    removeRuleIds
  }: browser.DeclarativeNetRequest.UpdateSessionRulesOptionsType): Promise<void> {
    if (removeRuleIds && addRules) {
      removeRuleIds.forEach(id => this.sessionRules.delete(id))
      addRules.forEach(rule => this.sessionRules.set(rule.id, rule))
    }
  }

  async getSessionRules (): Promise<browser.DeclarativeNetRequest.Rule[]> {
    return [...this.sessionRules.values()]
  }

  async getEnabledRulesets(): Promise<browser.DeclarativeNetRequest.MatchedRule["rulesetId"][]> {
    throw new Error('Method not implemented.')
  }

  async getDisabledRulesets (): Promise<browser.DeclarativeNetRequest.MatchedRule["rulesetId"][]> {
    throw new Error('Method not implemented.')
  }

  async updateEnabledRulesets (options: browser.DeclarativeNetRequest.UpdateEnabledRulesetsUpdateRulesetOptionsType): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async getAvailableStaticRuleCount (): Promise<number> {
    throw new Error('Method not implemented.')
  }

  async testMatchOutcome (
    request: browser.DeclarativeNetRequest.TestMatchOutcomeRequestType,
    options: browser.DeclarativeNetRequest.TestMatchOutcomeOptionsType
  ): Promise<browser.DeclarativeNetRequest.TestMatchOutcomeCallbackResultType> {
    throw new Error('Method not implemented.')
  }
}

export default DeclarativeNetRequestMock
