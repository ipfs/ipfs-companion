'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function ipfsNodeForm ({ ipfsNodeType, ipfsNodeConfig, onOptionChange }) {
  const onIpfsNodeTypeChange = onOptionChange('ipfsNodeType')
  const onIpfsNodeConfigChange = onOptionChange('ipfsNodeConfig')

  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_nodeType')}</legend>
        <div>
          <label for="ipfsNodeType">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsNodeType_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_ipfsNodeType_description')}
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/node-types.md" target="_blank">
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
            <option
              value='embedded'
              selected=${ipfsNodeType === 'embedded'}>
              ${browser.i18n.getMessage('option_ipfsNodeType_embedded')}
            </option>
          </select>
        </div>
        ${ipfsNodeType === 'embedded' ? html`
          <div>
            <label for="ipfsNodeConfig">
              <dl>
                <dt>${browser.i18n.getMessage('option_ipfsNodeConfig_title')}</dt>
                <dd>${browser.i18n.getMessage('option_ipfsNodeConfig_description')}</dd>
              </dl>
            </label>
            <textarea id="ipfsNodeConfig" rows="4" onchange=${onIpfsNodeConfigChange}>${ipfsNodeConfig}</textarea>
          </div>
        ` : null}
      </fieldset>
    </form>
  `
}

module.exports = ipfsNodeForm
