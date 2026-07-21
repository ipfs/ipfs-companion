'use strict'

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import { guiURLString } from '../../lib/options.js'
import switchToggle from '../../pages/components/switch-toggle.js'

export default function apiForm ({ ipfsNodeType, ipfsApiUrl, ipfsApiPollForegroundSeconds, ipfsApiPollBackgroundSeconds, automaticMode, onOptionChange }) {
  const onIpfsApiUrlChange = onOptionChange('ipfsApiUrl', (url) => guiURLString(url, { useLocalhostName: false }))
  const onIpfsApiPollForegroundSecondsChange = onOptionChange('ipfsApiPollForegroundSeconds')
  const onIpfsApiPollBackgroundSecondsChange = onOptionChange('ipfsApiPollBackgroundSeconds')
  const onAutomaticModeChange = onOptionChange('automaticMode')
  const apiAddresEditable = ipfsNodeType === 'external'

  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_api')}</h2>
        <div class="mb2">
          ${browser.i18n.getMessage('option_api_sectionIntro')}
          <a class="link underline hover-aqua" href="https://docs.ipfs.tech/reference/kubo/rpc/" target="_blank">${browser.i18n.getMessage('option_legend_readMore')}</a>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="ipfsApiUrl">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsApiUrl_title')}</dt>
              <dd>${browser.i18n.getMessage('option_ipfsApiUrl_description')}</dd>
            </dl>
          </label>
          <input
            class="bg-white navy self-center-ns"
            id="ipfsApiUrl"
            type="url"
            inputmode="url"
            required
            pattern="https?://.+"
            spellcheck="false"
            title="${browser.i18n.getMessage(apiAddresEditable ? 'option_hint_url' : 'option_hint_readonly')}"
            onchange=${onIpfsApiUrlChange}
            ${apiAddresEditable ? '' : 'disabled'}
            value=${ipfsApiUrl} />
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="ipfsApiPollForegroundSeconds">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsApiPollForegroundSeconds_title')}</dt>
              <dd>${browser.i18n.getMessage('option_ipfsApiPollForegroundSeconds_description')}</dd>
            </dl>
          </label>
          <input
            class="bg-white navy self-center-ns"
            id="ipfsApiPollForegroundSeconds"
            type="number"
            inputmode="numeric"
            min="1"
            max="60"
            step="1"
            required
            onchange=${onIpfsApiPollForegroundSecondsChange}
            value=${ipfsApiPollForegroundSeconds} />
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="ipfsApiPollBackgroundSeconds">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsApiPollBackgroundSeconds_title')}</dt>
              <dd>${browser.i18n.getMessage('option_ipfsApiPollBackgroundSeconds_description')}</dd>
            </dl>
          </label>
          <input
            class="bg-white navy self-center-ns"
            id="ipfsApiPollBackgroundSeconds"
            type="number"
            inputmode="numeric"
            min="30"
            max="3600"
            step="5"
            required
            onchange=${onIpfsApiPollBackgroundSecondsChange}
            value=${ipfsApiPollBackgroundSeconds} />
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="automaticMode">
            <dl>
              <dt>${browser.i18n.getMessage('option_automaticMode_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_automaticMode_description')}
                ${!automaticMode ? html`<p class="red i">${browser.i18n.getMessage('option_automaticMode_description_subtext')}</p>` : null}
              </dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'automaticMode', checked: automaticMode, onchange: onAutomaticModeChange })}</div>
        </div>
      </fieldset>
    </form>
  `
}
