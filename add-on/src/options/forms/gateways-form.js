'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')
const { normalizeGatewayURL, hostTextToArray, hostArrayToText } = require('../../lib/options')

// Warn about mixed content issues when changing the gateway
// https://github.com/ipfs-shipyard/ipfs-companion/issues/648
const secureContextUrl = /^https:\/\/|^http:\/\/127.0.0.1|^http:\/\/\[::1\]/

function gatewaysForm ({
  ipfsNodeType,
  customGatewayUrl,
  useCustomGateway,
  noRedirectHostnames,
  publicGatewayUrl,
  publicSubdomainGatewayUrl,
  onOptionChange
}) {
  const onCustomGatewayUrlChange = onOptionChange('customGatewayUrl', normalizeGatewayURL)
  const onUseCustomGatewayChange = onOptionChange('useCustomGateway')
  const onPublicGatewayUrlChange = onOptionChange('publicGatewayUrl', normalizeGatewayURL)
  const onPublicSubdomainGatewayUrlChange = onOptionChange('publicSubdomainGatewayUrl', normalizeGatewayURL)
  const onNoRedirectHostnamesChange = onOptionChange('noRedirectHostnames', hostTextToArray)
  const mixedContentWarning = !secureContextUrl.test(customGatewayUrl)
  const supportRedirectToCustomGateway = ipfsNodeType !== 'embedded'
  const allowChangeOfCustomGateway = ipfsNodeType !== 'embedded:chromesockets'

  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_gateways')}</legend>
          <div>
            <label for="publicGatewayUrl">
              <dl>
                <dt>${browser.i18n.getMessage('option_publicGatewayUrl_title')}</dt>
                <dd>${browser.i18n.getMessage('option_publicGatewayUrl_description')}</dd>
              </dl>
            </label>
            <input
              id="publicGatewayUrl"
              type="url"
              inputmode="url"
              required
              pattern="^https?://[^/]+/?$"
              spellcheck="false"
              title="Enter URL without any sub-path"
              onchange=${onPublicGatewayUrlChange}
              value=${publicGatewayUrl} />
          </div>
          <div>
            <label for="publicSubdomainGatewayUrl">
              <dl>
                <dt>${browser.i18n.getMessage('option_publicSubdomainGatewayUrl_title')}</dt>
                <dd>
                  ${browser.i18n.getMessage('option_publicSubdomainGatewayUrl_description')}
                  <p><a href="https://docs.ipfs.io/guides/guides/addressing/#subdomain-gateway" target="_blank">
                    ${browser.i18n.getMessage('option_legend_readMore')}
                  </a></p>
                </dd>
              </dl>
            </label>
            <input
              id="publicSubdomainGatewayUrl"
              type="url"
              inputmode="url"
              required
              pattern="^https?://[^/]+/?$"
              spellcheck="false"
              title="Enter URL without any sub-path"
              onchange=${onPublicSubdomainGatewayUrlChange}
              value=${publicSubdomainGatewayUrl} />
          </div>
          ${supportRedirectToCustomGateway && allowChangeOfCustomGateway ? html`
            <div>
              <label for="customGatewayUrl">
                <dl>
                  <dt>${browser.i18n.getMessage('option_customGatewayUrl_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_customGatewayUrl_description')}
                    ${mixedContentWarning ? html`<p class="red i">${browser.i18n.getMessage('option_customGatewayUrl_warning')}</p>` : null}
                  </dd>
                </dl>
              </label>
              <input
                id="customGatewayUrl"
                type="url"
                inputmode="url"
                required
                pattern="^https?://[^/]+/?$"
                spellcheck="false"
                title="Enter URL without any sub-path"
                onchange=${onCustomGatewayUrlChange}
                ${allowChangeOfCustomGateway ? '' : 'disabled'}
                value=${customGatewayUrl} />

            </div>
          ` : null}
          ${supportRedirectToCustomGateway ? html`
            <div>
              <label for="useCustomGateway">
                <dl>
                  <dt>${browser.i18n.getMessage('option_useCustomGateway_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_useCustomGateway_description')}</dd>
                </dl>
              </label>
              <div>${switchToggle({ id: 'useCustomGateway', checked: useCustomGateway, onchange: onUseCustomGatewayChange })}</div>
            </div>
          ` : null}
          ${supportRedirectToCustomGateway ? html`
            <div>
              <label for="noRedirectHostnames">
                <dl>
                  <dt>${browser.i18n.getMessage('option_noRedirectHostnames_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_noRedirectHostnames_description')}</dd>
                </dl>
              </label>
              <textarea
                id="noRedirectHostnames"
                spellcheck="false"
                onchange=${onNoRedirectHostnamesChange}
                rows="4"
                >${hostArrayToText(noRedirectHostnames)}</textarea>
            </div>
          ` : null}
      </fieldset>
    </form>
  `
}

module.exports = gatewaysForm
