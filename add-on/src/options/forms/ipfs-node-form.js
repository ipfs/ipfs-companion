'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import { braveNodeType } from '../../lib/ipfs-client/brave.js'

export default function ipfsNodeForm ({ ipfsNodeType, onOptionChange, withNodeFromBrave }) {
  const onIpfsNodeTypeChange = onOptionChange('ipfsNodeType')
  const braveClass = ipfsNodeType === braveNodeType ? 'brave' : ''
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
                ${withNodeFromBrave ? html`<p>${browser.i18n.getMessage('option_ipfsNodeType_brave_description')}</p>` : null}
              </dd>
            </dl>
          </label>
          <select id="ipfsNodeType" name='ipfsNodeType' class="self-center-ns bg-white navy ${braveClass}" onchange=${onIpfsNodeTypeChange}>
            <option
              value='external'
              selected=${ipfsNodeType === 'external'}>
              ${browser.i18n.getMessage('option_ipfsNodeType_external')}
            </option>
            ${withNodeFromBrave
            ? html`<option
                  value='external:brave'
                  selected=${ipfsNodeType === 'external:brave'}>
                  ${browser.i18n.getMessage('option_ipfsNodeType_brave')}
                </option>`
              : null}
          </select>
        </div>
      </fieldset>
    </form>
  `
}
