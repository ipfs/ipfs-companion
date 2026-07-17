'use strict'

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import switchToggle from '../../pages/components/switch-toggle.js'
import { guiURLString, hostTextToArray, hostArrayToText } from '../../lib/options.js'
import { POSSIBLE_NODE_TYPES } from '../../lib/state.js'

// Warn about mixed content issues when changing the gateway
// to something other than HTTP or localhost
// https://github.com/ipfs-shipyard/ipfs-companion/issues/648
const secureContextUrl = /^https:\/\/|^http:\/\/localhost|^http:\/\/127.0.0.1|^http:\/\/\[::1\]/

export default function gatewaysForm ({
  ipfsNodeType,
  customGatewayUrl,
  useCustomGateway,
  useSubdomains,
  redirectSubresources,
  disabledOn,
  enabledOn,
  publicGatewayUrl,
  publicSubdomainGatewayUrl,
  usePublicGatewaysForShare,
  onOptionChange
}) {
  const onCustomGatewayUrlChange = onOptionChange('customGatewayUrl', (url) => guiURLString(url, { useLocalhostName: useSubdomains }))
  const onUseCustomGatewayChange = onOptionChange('useCustomGateway')
  const onUseSubdomainProxyChange = onOptionChange('useSubdomains')
  const onRedirectSubresourcesChange = onOptionChange('redirectSubresources')
  const onPublicGatewayUrlChange = onOptionChange('publicGatewayUrl', guiURLString)
  const onPublicSubdomainGatewayUrlChange = onOptionChange('publicSubdomainGatewayUrl', guiURLString)
  const onUsePublicGatewaysForShareChange = onOptionChange('usePublicGatewaysForShare')
  // sharing via public gateways needs at least one gateway URL set
  const anyPublicGatewayConfigured = Boolean(publicGatewayUrl || publicSubdomainGatewayUrl)
  const onDisabledOnChange = onOptionChange('disabledOn', hostTextToArray)
  const onEnabledOnChange = onOptionChange('enabledOn', hostTextToArray)
  const mixedContentWarning = !secureContextUrl.test(customGatewayUrl)
  const supportRedirectToCustomGateway = POSSIBLE_NODE_TYPES.includes(ipfsNodeType)
  const allowChangeOfCustomGateway = ipfsNodeType === 'external'

  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_gateways')}</h2>
          ${supportRedirectToCustomGateway
            ? html`<div class="flex-row-ns pb0-ns">
              <label for="customGatewayUrl">
                <dl>
                  <dt>${browser.i18n.getMessage('option_customGatewayUrl_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_customGatewayUrl_description')}
                    ${mixedContentWarning ? html`<p class="red i">${browser.i18n.getMessage('option_customGatewayUrl_warning')}</p>` : null}
                  </dd>
                </dl>
              </label>
              <input
                class="bg-white navy self-center-ns"
                id="customGatewayUrl"
                type="url"
                inputmode="url"
                required
                pattern="https?://.+"
                spellcheck="false"
                title="${browser.i18n.getMessage(allowChangeOfCustomGateway ? 'option_hint_url' : 'option_hint_readonly')}"
                onchange=${onCustomGatewayUrlChange}
                ${allowChangeOfCustomGateway ? '' : 'disabled'}
                value=${customGatewayUrl} />
            </div>`
            : null}
          ${supportRedirectToCustomGateway
          ? html`<div class="flex-row-ns pb0-ns">
              <label for="useCustomGateway">
                <dl>
                  <dt>${browser.i18n.getMessage('option_useCustomGateway_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_useCustomGateway_description')}</dd>
                </dl>
              </label>
              <div class="self-center-ns">${switchToggle({ id: 'useCustomGateway', checked: useCustomGateway, onchange: onUseCustomGatewayChange })}</div>
            </div>`
          : null}
          ${supportRedirectToCustomGateway
          ? html`<div class="flex-row-ns pb0-ns">
              <label for="useSubdomains">
                <dl>
                  <dt>${browser.i18n.getMessage('option_useSubdomains_title')}</dt>
                  <dd>
                    ${browser.i18n.getMessage('option_useSubdomains_description')}
                    ${!useSubdomains ? html`<p class="red i">${browser.i18n.getMessage('option_useSubdomains_warning')}</p>` : null}
                    <p><a class="link underline hover-aqua" href="https://docs.ipfs.tech/how-to/address-ipfs-on-web/#subdomain-gateway" target="_blank">
                      ${browser.i18n.getMessage('option_legend_readMore')}
                    </a></p>
                  </dd>
                </dl>
              </label>
              <div class="self-center-ns">${switchToggle({ id: 'useSubdomains', checked: useSubdomains, onchange: onUseSubdomainProxyChange })}</div>
            </div>`
            : null}
          ${supportRedirectToCustomGateway
          ? html`<div class="flex-row-ns pb0-ns">
              <label for="redirectSubresources">
                <dl>
                  <dt>${browser.i18n.getMessage('option_redirectSubresources_title')}</dt>
                  <dd>
                    ${browser.i18n.getMessage('option_redirectSubresources_description')}
                    ${redirectSubresources ? html`<p class="red i">${browser.i18n.getMessage('option_redirectSubresources_warning')}</p>` : null}
                  </dd>
                </dl>
              </label>
              <div class="self-center-ns">${switchToggle({ id: 'redirectSubresources', checked: redirectSubresources, onchange: onRedirectSubresourcesChange })}</div>
            </div>`
            : null}
          <div class="flex-row-ns pb0-ns">
            <label for="publicGatewayUrl">
              <dl>
                <dt>${browser.i18n.getMessage('option_publicGatewayUrl_title')}</dt>
                <dd>
                  ${browser.i18n.getMessage('option_publicGatewayUrl_description')}
                  <p><a class="link underline hover-aqua" href="https://specs.ipfs.tech/http-gateways/path-gateway/" target="_blank">
                    ${browser.i18n.getMessage('option_legend_readMore')}
                  </a></p>
                </dd>
              </dl>
            </label>
            <input
              class="bg-white navy self-center-ns"
              id="publicGatewayUrl"
              type="url"
              inputmode="url"
              pattern="https?://.+"
              spellcheck="false"
              title="${browser.i18n.getMessage('option_hint_url')}"
              onchange=${onPublicGatewayUrlChange}
              value=${publicGatewayUrl} />
          </div>
          <div class="flex-row-ns pb0-ns">
            <label for="publicSubdomainGatewayUrl">
              <dl>
                <dt>${browser.i18n.getMessage('option_publicSubdomainGatewayUrl_title')}</dt>
                <dd>
                  ${browser.i18n.getMessage('option_publicSubdomainGatewayUrl_description')}
                  <p><a class="link underline hover-aqua" href="https://specs.ipfs.tech/http-gateways/subdomain-gateway/" target="_blank">
                    ${browser.i18n.getMessage('option_legend_readMore')}
                  </a></p>
                </dd>
              </dl>
            </label>
            <input
              class="bg-white navy self-center-ns"
              id="publicSubdomainGatewayUrl"
              type="url"
              inputmode="url"
              pattern="https?://.+"
              spellcheck="false"
              title="${browser.i18n.getMessage('option_hint_url')}"
              onchange=${onPublicSubdomainGatewayUrlChange}
              value=${publicSubdomainGatewayUrl} />
          </div>
          <div class="flex-row-ns pb0-ns">
            <label for="usePublicGatewaysForShare">
              <dl>
                <dt>${browser.i18n.getMessage('option_usePublicGatewaysForShare_title')}</dt>
                <dd>${browser.i18n.getMessage('option_usePublicGatewaysForShare_description')}</dd>
              </dl>
            </label>
            <div class="self-center-ns">${switchToggle({ id: 'usePublicGatewaysForShare', checked: usePublicGatewaysForShare && anyPublicGatewayConfigured, onchange: onUsePublicGatewaysForShareChange, disabled: !anyPublicGatewayConfigured })}</div>
          </div>
          ${supportRedirectToCustomGateway
          ? html`<div class="flex-row-ns pb0-ns">
              <label for="disabledOn">
                <dl>
                  <dt>${browser.i18n.getMessage('option_disabledOn_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_disabledOn_description')}</dd>
                </dl>
              </label>
              <textarea
                class="bg-white navy self-center-ns"
                id="disabledOn"
                spellcheck="false"
                onchange=${onDisabledOnChange}
                rows="${Math.min(disabledOn.length + 1, 10)}"
                >${hostArrayToText(disabledOn)}</textarea>
            </div>
            <div class="flex-row-ns pb0-ns">
              <label for="enabledOn">
                <dl>
                  <dt>${browser.i18n.getMessage('option_enabledOn_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_enabledOn_description')}</dd>
                </dl>
              </label>
              <textarea
                class="bg-white navy self-center-ns"
                id="enabledOn"
                spellcheck="false"
                onchange=${onEnabledOnChange}
                rows="${Math.min(enabledOn.length + 1, 10)}"
                >${hostArrayToText(enabledOn)}</textarea>
            </div>`
            : null}

      </fieldset>
    </form>
  `
}
