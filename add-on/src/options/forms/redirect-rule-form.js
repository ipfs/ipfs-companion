'use strict'
/* eslint-env browser, webextensions */

import html from 'choo/html/index.js'
import browser from 'webextension-polyfill'

/**
 *
 * @param {(event: string, value?: any) => void} emit
 * @returns
 */
function ruleItem (emit) {
  /**
   * Renders Rule Item
   *
   * @param {{
   *   id: string
   *   origin: string
   *   target: string
   * }} param0
   * @returns
   */
  return function ({ id, origin, target }) {
    return html`
      <div class="flex-row-ns pb0-ns">
        <dl>
          <dt>
          <span class="b">${browser.i18n.getMessage('option_redirect_rules_row_origin')}:</span> ${origin}
          </dt>
          <dt>
          <span class="b">${browser.i18n.getMessage('option_redirect_rules_row_target')}:</span> ${target}
          </dt>
        </dl>
        <div class="flex flex-column rule-delete">
          <button class="f6 ph3 pv2 mt2 mb0 bg-transparent b--none red" onclick=${() => emit('redirectRuleDeleteRequest', id)}>X</button>
        </div>
      </div>
    `
  }
}

/**
 *
 * @param {{
 *   emit: (event: string, value?: any) => void,
 *   redirectRules: {
 *     id: string
 *     origin: string
 *     target: string
 *   }[]
 * }} param0
 * @returns
 */
export default function redirectRuleForm ({ emit, redirectRules }) {
  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_redirect_rules')}</h2>
        <div class="flex-row-ns pb0-ns">
          <label for="deleteAllRules">
            <dl>
              <dt>
                <div class="self-right-ns">
                  Found ${redirectRules?.length ?? 0} rules
                </div>
              </dt>
            </dl>
          </label>
          <div class="self-center-ns">
            <button id="deleteAllRules" class="Button transition-all sans-serif v-mid fw5 nowrap lh-copy bn br1 pa2 pointer focus-outline white bg-red white" onclick=${() => emit('redirectRuleDeleteRequest')}>${browser.i18n.getMessage('option_redirect_rules_reset_all')}</button>
          </div>
        </div>
        <div>
          ${redirectRules ? redirectRules.map(ruleItem(emit)) : html`<div>Loading...</div>`}
        </div>
      </fieldset>
    </form>
  `
}
