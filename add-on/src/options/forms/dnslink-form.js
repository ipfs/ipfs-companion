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
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_dnslink')}</h2>
        <div class="flex-row-ns pb0-ns">
          <label for="dnslinkPolicy">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkPolicy_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkPolicy_description')}
                <p><a class="link underline hover-aqua" href="https://docs.ipfs.io/how-to/dnslink-companion/" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <select id="dnslinkPolicy" name='dnslinkPolicy' class="self-center-ns bg-white" onchange=${onDnslinkPolicyChange}>
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
        <div class="flex-row-ns pb0-ns">
          <label for="dnslinkDataPreload">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkDataPreload_title')}</dt>
              <dd>${browser.i18n.getMessage('option_dnslinkDataPreload_description')}</dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'dnslinkDataPreload', checked: dnslinkDataPreload, disabled: dnslinkRedirect, onchange: onDnslinkDataPreloadChange })}</div>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="dnslinkRedirect">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkRedirect_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkRedirect_description')}
                ${dnslinkRedirect ? html`<p class="red i">${browser.i18n.getMessage('option_dnslinkRedirect_warning')}</p>` : null}
                <p><a class="link underline hover-aqua" href="https://docs.ipfs.io/how-to/address-ipfs-on-web/#subdomain-gateway" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'dnslinkRedirect', checked: dnslinkRedirect, onchange: onDnslinkRedirectChange })}</div>
        </div>
      </fieldset>
    </form>
  `
}

module.exports = dnslinkForm
