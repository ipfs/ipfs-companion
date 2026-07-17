'use strict'

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import { POSSIBLE_NODE_TYPES } from '../../lib/state.js'

export default function ipfsNodeForm ({ ipfsNodeType, onOptionChange }) {
  const onIpfsNodeTypeChange = onOptionChange('ipfsNodeType')
  // with a single possible node type there is nothing to choose, so the
  // select row is hidden and the section shows only the explainer below
  const showNodeTypeSelect = POSSIBLE_NODE_TYPES.length > 1
  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_nodeType')}</h2>
        ${showNodeTypeSelect
          ? html`<div class="flex-row-ns pb0-ns">
            <label for="ipfsNodeType">
              <dl>
                <dt>${browser.i18n.getMessage('option_ipfsNodeType_title')}</dt>
                <dd>
                  <p>${browser.i18n.getMessage('option_ipfsNodeType_external_description')}</p>
                </dd>
              </dl>
            </label>
            <select id="ipfsNodeType" name='ipfsNodeType' class="self-center-ns bg-white navy" onchange=${onIpfsNodeTypeChange}>
              ${POSSIBLE_NODE_TYPES.map(nodeType => html`<option
                value=${nodeType}
                selected=${ipfsNodeType === nodeType}>
                ${browser.i18n.getMessage(`option_ipfsNodeType_${nodeType}`)}
              </option>`)}
            </select>
          </div>`
          : null}
        ${ipfsNodeType === 'external'
          ? html`<div class="flex-row-ns pb0-ns">
            <dl>
              <dt class="fw6">${browser.i18n.getMessage('option_ipfsNodeType_external')}</dt>
              <dd class="ml0 mv2">
                ${browser.i18n.getMessage('option_ipfsNodeType_external_explainer')}
                <p>
                  <a class="link underline hover-aqua" href="https://docs.ipfs.tech/install/command-line/" target="_blank">
                    ${browser.i18n.getMessage('option_ipfsNodeType_external_installKubo')}
                  </a> | <a class="link underline hover-aqua" href="https://docs.ipfs.tech/install/ipfs-desktop/" target="_blank">
                    ${browser.i18n.getMessage('option_ipfsNodeType_external_installDesktop')}
                  </a> | <a class="link underline hover-aqua" href="https://docs.ipfs.tech/reference/kubo/rpc/" target="_blank">
                    ${browser.i18n.getMessage('option_ipfsNodeType_external_rpcDocs')}
                  </a>
                </p>
              </dd>
            </dl>
          </div>`
          : null}
      </fieldset>
    </form>
  `
}
