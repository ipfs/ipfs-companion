'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')
const { guiURLString, hostTextToArray, hostArrayToText } = require('../../lib/options')

// Warn about mixed content issues when changing the gateway
// to something other than HTTP or localhost
// https://github.com/ipfs-shipyard/ipfs-companion/issues/648
const secureContextUrl = /^https:\/\/|^http:\/\/localhost|^http:\/\/127.0.0.1|^http:\/\/\[::1\]/

function gatewaysForm ({
  ipfsNodeType,
  customGatewayUrl,
  useCustomGateway,
  useSubdomains,
  noIntegrationsHostnames,
  publicGatewayUrl,
  publicSubdomainGatewayUrl,
  onOptionChange
}) {
  const onCustomGatewayUrlChange = onOptionChange('customGatewayUrl', (url) => guiURLString(url, { useLocalhostName: useSubdomains }))
  const onUseCustomGatewayChange = onOptionChange('useCustomGateway')
  const onUseSubdomainProxyChange = onOptionChange('useSubdomains')
  const onPublicGatewayUrlChange = onOptionChange('publicGatewayUrl', guiURLString)
  const onPublicSubdomainGatewayUrlChange = onOptionChange('publicSubdomainGatewayUrl', guiURLString)
  const onNoIntegrationsHostnamesChange = onOptionChange('noIntegrationsHostnames', hostTextToArray)
  const mixedContentWarning = !secureContextUrl.test(customGatewayUrl)
  const supportRedirectToCustomGateway = ipfsNodeType !== 'embedded'
  const allowChangeOfCustomGateway = ipfsNodeType !== 'embedded:chromesockets'

  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_gateways')}</h2>
          <div class="flex-row-ns pb0-ns">
            <label for="publicGatewayUrl">
              <dl>
                <dt>${browser.i18n.getMessage('option_publicGatewayUrl_title')}</dt>
                <dd>${browser.i18n.getMessage('option_publicGatewayUrl_description')}</dd>
              </dl>
            </label>
            <input
              class="bg-white navy self-center-ns"
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
          <div class="flex-row-ns pb0-ns">
            <label for="publicSubdomainGatewayUrl">
              <dl>
                <dt>${browser.i18n.getMessage('option_publicSubdomainGatewayUrl_title')}</dt>
                <dd>
                  ${browser.i18n.getMessage('option_publicSubdomainGatewayUrl_description')}
                  <p><a class="link underline hover-aqua" href="https://docs-beta.ipfs.io/how-to/address-ipfs-on-web/#subdomain-gateway" target="_blank">
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
              required
              pattern="^https?://[^/]+/?$"
              spellcheck="false"
              title="Enter URL without any sub-path"
              onchange=${onPublicSubdomainGatewayUrlChange}
              value=${publicSubdomainGatewayUrl} />
          </div>
          ${supportRedirectToCustomGateway && allowChangeOfCustomGateway ? html`
            <div class="flex-row-ns pb0-ns">
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
                pattern="^https?://[^/]+/?$"
                spellcheck="false"
                title="Enter URL without any sub-path"
                onchange=${onCustomGatewayUrlChange}
                ${allowChangeOfCustomGateway ? '' : 'disabled'}
                value=${customGatewayUrl} />

            </div>
          ` : null}
          ${supportRedirectToCustomGateway ? html`
            <div class="flex-row-ns pb0-ns">
              <label for="useCustomGateway">
                <dl>
                  <dt>${browser.i18n.getMessage('option_useCustomGateway_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_useCustomGateway_description')}</dd>
                </dl>
              </label>
              <div class="self-center-ns">${switchToggle({ id: 'useCustomGateway', checked: useCustomGateway, onchange: onUseCustomGatewayChange })}</div>
            </div>
          ` : null}
          ${supportRedirectToCustomGateway ? html`
            <div class="flex-row-ns pb0-ns">
              <label for="useSubdomains">
                <dl>
                  <dt>${browser.i18n.getMessage('option_useSubdomains_title')}</dt>
                  <dd>
                    ${browser.i18n.getMessage('option_useSubdomains_description')}
                    <p><a class="link underline hover-aqua" href="https://docs-beta.ipfs.io/how-to/address-ipfs-on-web/#subdomain-gateway" target="_blank">
                      ${browser.i18n.getMessage('option_legend_readMore')}
                    </a></p>
                  </dd>
                </dl>
              </label>
              <div class="self-center-ns">${switchToggle({ id: 'useSubdomains', checked: useSubdomains, onchange: onUseSubdomainProxyChange })}</div>
            </div>
          ` : null}
          ${supportRedirectToCustomGateway ? html`
            <div class="flex-row-ns pb0-ns">
              <label for="noIntegrationsHostnames">
                <dl>
                  <dt>${browser.i18n.getMessage('option_noIntegrationsHostnames_title')}</dt>
                  <dd>${browser.i18n.getMessage('option_noIntegrationsHostnames_description')}</dd>
                </dl>
              </label>
              <textarea
                class="bg-white navy self-center-ns"
                id="noIntegrationsHostnames"
                spellcheck="false"
                onchange=${onNoIntegrationsHostnamesChange}
                rows="1"
                >${hostArrayToText(noIntegrationsHostnames)}</textarea>
            </div>
          ` : null}

      </fieldset>
    </form>
  `
}

module.exports = gatewaysForm
