import browser from 'webextension-polyfill'

/**
 * https://github.com/acvetkov/sinon-chrome/issues/110
 *
 * Since this is not implemented in sinon-chrome, this is a bare-bones mock implementation.
 * This still needs to be instrumented in sinon, to be able to assert on calls.
 */
class DeclarativeNetRequestMock {
  private rules: Map<number, browser.DeclarativeNetRequest.Rule>;

  constructor() {
    this.rules = new Map()
  }

  async getDynamicRules(): Promise<browser.DeclarativeNetRequest.Rule[]> {
    return [...this.rules.values()]
  }

  async updateDynamicRules({
    addRules,
    removeRuleIds
  }: {
    addRules: browser.DeclarativeNetRequest.Rule[],
    removeRuleIds: number[]
  }): Promise<void> {
    removeRuleIds.forEach(id => this.rules.delete(id))
    addRules.forEach(rule => this.rules.set(rule.id, rule))
  }
}

export default DeclarativeNetRequestMock
