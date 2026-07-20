'use strict'

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import switchToggle from '../../pages/components/switch-toggle.js'

export default function dnslinkForm ({
  dnslinkLookup,
  dnslinkRedirect,
  useSubdomains,
  onOptionChange
}) {
  const onDnslinkLookupChange = onOptionChange('dnslinkLookup')
  const onDnslinkRedirectChange = onOptionChange('dnslinkRedirect')

  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_dnslink')}</h2>
        <div class="mb2">
          ${browser.i18n.getMessage('option_dnslink_sectionIntro')}
          <a class="link underline hover-aqua" href="https://docs.ipfs.tech/concepts/dnslink/" target="_blank">${browser.i18n.getMessage('option_legend_readMore')}</a>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="dnslinkLookup">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkLookup_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkLookup_description')}
                <p><a class="link underline hover-aqua" href="https://docs.ipfs.tech/how-to/dnslink-companion/" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'dnslinkLookup', checked: dnslinkLookup, onchange: onDnslinkLookupChange })}</div>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="dnslinkRedirect">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkRedirect_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkRedirect_description')}
                ${dnslinkLookup && dnslinkRedirect && !useSubdomains ? html`<p class="red i">${browser.i18n.getMessage('option_dnslinkRedirect_warning')}</p>` : null}
                <p><a class="link underline hover-aqua" href="https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'dnslinkRedirect', checked: dnslinkRedirect, disabled: !dnslinkLookup, onchange: onDnslinkRedirectChange })}</div>
        </div>
      </fieldset>
    </form>
  `
}
