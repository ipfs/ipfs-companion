'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const { hasChromeSocketsForTcp } = require('../../lib/runtime-checks')

function ipfsNodeForm ({ ipfsNodeType, ipfsNodeConfig, onOptionChange }) {
  const onIpfsNodeTypeChange = onOptionChange('ipfsNodeType')
  const onIpfsNodeConfigChange = onOptionChange('ipfsNodeConfig')
  const withChromeSockets = hasChromeSocketsForTcp()
  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_nodeType')}</legend>
        <div>
          <label for="ipfsNodeType">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsNodeType_title')}</dt>
              <dd>
                <p>${browser.i18n.getMessage('option_ipfsNodeType_external_description')}</p>
                <p>${browser.i18n.getMessage(withChromeSockets ? 'option_ipfsNodeType_embedded_chromesockets_description' : 'option_ipfsNodeType_embedded_description')}</p>
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/node-types.md#node-types-in-ipfs-companion" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <select id="ipfsNodeType" name='ipfsNodeType' onchange=${onIpfsNodeTypeChange}>
            <option
              value='external'
              selected=${ipfsNodeType === 'external'}>
              ${browser.i18n.getMessage('option_ipfsNodeType_external')}
            </option>
            ${withChromeSockets ? html`
                <option
                  value='embedded:chromesockets'
                  selected=${ipfsNodeType === 'embedded:chromesockets'}>
                  ${browser.i18n.getMessage('option_ipfsNodeType_embedded_chromesockets')} (${browser.i18n.getMessage('option_experimental')})
                </option>
              ` : html`
                <option
                  value='embedded'
                  selected=${ipfsNodeType === 'embedded'}>
                  ${browser.i18n.getMessage('option_ipfsNodeType_embedded')} (${browser.i18n.getMessage('option_experimental')})
                </option>
              `}
          </select>
        </div>
        ${ipfsNodeType.startsWith('embedded') ? html`
          <div>
            <label for="ipfsNodeConfig">
              <dl>
                <dt>${browser.i18n.getMessage('option_ipfsNodeConfig_title')}</dt>
                <dd>${browser.i18n.getMessage('option_ipfsNodeConfig_description')}</dd>
              </dl>
            </label>
            <textarea id="ipfsNodeConfig" rows="7" onchange=${onIpfsNodeConfigChange}>${ipfsNodeConfig}</textarea>
          </div>
        ` : null}
      </fieldset>
    </form>
  `
}

module.exports = ipfsNodeForm
