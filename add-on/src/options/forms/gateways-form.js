'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const { normalizeGatewayURL } = require('../../lib/options')

function gatewaysForm ({
  customGatewayUrl,
  useCustomGateway,
  publicGatewayUrl,
  onOptionChange
}) {
  const onCustomGatewayUrlChange = onOptionChange('customGatewayUrl', normalizeGatewayURL)
  const onUseCustomGatewayChange = onOptionChange('useCustomGateway')
  const onPublicGatewayUrlChange = onOptionChange('publicGatewayUrl', normalizeGatewayURL)

  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_gateways')}</legend>
        <div>
          <label for="customGatewayUrl">
            <dl>
              <dt>${browser.i18n.getMessage('option_customGatewayUrl_title')}</dt>
              <dd>${browser.i18n.getMessage('option_customGatewayUrl_description')}</dd>
            </dl>
          </label>
          <input
            id="customGatewayUrl"
            type="url"
            inputmode="url"
            required
            pattern="^https?://[^/]+$"
            spellcheck="false"
            title="Enter URL without any sub-path"
            onchange=${onCustomGatewayUrlChange}
            value=${customGatewayUrl} />
        </div>
        <div>
          <label for="useCustomGateway">
            <dl>
              <dt>${browser.i18n.getMessage('option_useCustomGateway_title')}</dt>
              <dd>${browser.i18n.getMessage('option_useCustomGateway_description')}</dd>
            </dl>
          </label>
          <input
            id="useCustomGateway"
            type="checkbox"
            onchange=${onUseCustomGatewayChange}
            checked=${useCustomGateway} />
        </div>
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
            pattern="^https?://[^/]+$"
            spellcheck="false"
            title="Enter URL without any sub-path"
            onchange=${onPublicGatewayUrlChange}
            value=${publicGatewayUrl} />
        </div>
      </fieldset>
    </form>
  `
}

module.exports = gatewaysForm
