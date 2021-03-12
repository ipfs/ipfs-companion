'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const { guiURLString } = require('../../lib/options')
const { braveNodeType } = require('../../lib/ipfs-client/brave')
const switchToggle = require('../../pages/components/switch-toggle')

function apiForm ({ ipfsNodeType, ipfsApiUrl, ipfsApiPollMs, automaticMode, onOptionChange }) {
  const onIpfsApiUrlChange = onOptionChange('ipfsApiUrl', (url) => guiURLString(url, { useLocalhostName: false }))
  const onIpfsApiPollMsChange = onOptionChange('ipfsApiPollMs')
  const onAutomaticModeChange = onOptionChange('automaticMode')
  const apiAddresEditable = ipfsNodeType === 'external'
  const braveClass = ipfsNodeType === braveNodeType ? 'brave' : ''

  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_api')}</h2>
        <div class="flex-row-ns pb0-ns">
          <label for="ipfsApiUrl">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsApiUrl_title')}</dt>
              <dd>${browser.i18n.getMessage('option_ipfsApiUrl_description')}</dd>
            </dl>
          </label>
          <input
            class="bg-white navy self-center-ns ${braveClass}"
            id="ipfsApiUrl"
            type="url"
            inputmode="url"
            required
            pattern="^https?://[^/]+/?$"
            spellcheck="false"
            title="${browser.i18n.getMessage(apiAddresEditable ? 'option_hint_url' : 'option_hint_readonly')}"
            onchange=${onIpfsApiUrlChange}
            ${apiAddresEditable ? '' : 'disabled'}
            value=${ipfsApiUrl} />
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="ipfsApiPollMs">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsApiPollMs_title')}</dt>
              <dd>${browser.i18n.getMessage('option_ipfsApiPollMs_description')}</dd>
            </dl>
          </label>
          <input
            class="bg-white navy self-center-ns"
            id="ipfsApiPollMs"
            type="number"
            inputmode="numeric"
            min="1000"
            max="60000"
            step="1000"
            required
            onchange=${onIpfsApiPollMsChange}
            value=${ipfsApiPollMs} />
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="automaticMode">
            <dl>
              <dt>${browser.i18n.getMessage('option_automaticMode_title')}</dt>
              <dd>${browser.i18n.getMessage('option_automaticMode_description')}</dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'automaticMode', checked: automaticMode, onchange: onAutomaticModeChange })}</div>
        </div>
      </fieldset>
    </form>
  `
}

module.exports = apiForm
