'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function dnslinkForm ({
  dnslinkPolicy,
  dnslinkDataPreload,
  dnslinkRedirect,
  onOptionChange
}) {
  const onDnslinkPolicyChange = onOptionChange('dnslinkPolicy')
  const onDnslinkRedirectChange = onOptionChange('dnslinkRedirect')
  const onDnslinkDataPreloadChange = onOptionChange('dnslinkDataPreload')

  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_dnslink')}</legend>
        <div>
          <label for="dnslinkPolicy">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkPolicy_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkPolicy_description')}
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/dnslink.md#dnslink-support-in-ipfs-companion" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <select id="dnslinkPolicy" name='dnslinkPolicy' onchange=${onDnslinkPolicyChange}>
            <option
              value='false'
              selected=${String(dnslinkPolicy) === 'false'}>
              ${browser.i18n.getMessage('option_dnslinkPolicy_disabled')}
            </option>
            <option
              value='best-effort'
              selected=${dnslinkPolicy === 'best-effort'}>
              ${browser.i18n.getMessage('option_dnslinkPolicy_bestEffort')}
            </option>
            <option
              value='enabled'
              selected=${dnslinkPolicy === 'enabled'}>
              ${browser.i18n.getMessage('option_dnslinkPolicy_enabled')}
            </option>
          </select>
        </div>
        <div>
          <label for="dnslinkDataPreload">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkDataPreload_title')}</dt>
              <dd>${browser.i18n.getMessage('option_dnslinkDataPreload_description')}</dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'dnslinkDataPreload', checked: dnslinkDataPreload, disabled: dnslinkRedirect, onchange: onDnslinkDataPreloadChange })}</div>
        </div>
        <div>
          <label for="dnslinkRedirect">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkRedirect_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkRedirect_description')}
                ${dnslinkRedirect ? html`<p class="red i">${browser.i18n.getMessage('option_dnslinkRedirect_warning')}</p>` : null}
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/issues/667" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'dnslinkRedirect', checked: dnslinkRedirect, onchange: onDnslinkRedirectChange })}</div>
        </div>
      </fieldset>
    </form>
  `
}

module.exports = dnslinkForm
