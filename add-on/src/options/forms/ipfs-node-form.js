'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'

export default function ipfsNodeForm ({ ipfsNodeType, onOptionChange }) {
  const onIpfsNodeTypeChange = onOptionChange('ipfsNodeType')
  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_nodeType')}</h2>
        <div class="flex-row-ns pb0-ns">
          <label for="ipfsNodeType">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsNodeType_title')}</dt>
              <dd>
                <p>${browser.i18n.getMessage('option_ipfsNodeType_external_description')}</p>
              </dd>
            </dl>
          </label>
          <select id="ipfsNodeType" name='ipfsNodeType' class="self-center-ns bg-white navy" onchange=${onIpfsNodeTypeChange}>
            <option
              value='external'
              selected=${ipfsNodeType === 'external'}>
              ${browser.i18n.getMessage('option_ipfsNodeType_external')}
            </option>
          </select>
        </div>
      </fieldset>
    </form>
  `
}
