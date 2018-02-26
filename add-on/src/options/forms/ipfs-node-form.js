'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function ipfsNodeForm ({ ipfsNodeType, onOptionChange }) {
  const onIpfsNodeTypeChange = onOptionChange('ipfsNodeType')

  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_nodeType')}</legend>
        <div>
          <label for="ipfsNodeType">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsNodeType_title')}</dt>
              <dd>${browser.i18n.getMessage('option_ipfsNodeType_description')}</dd>
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
      </fieldset>
    </form>
  `
}

module.exports = ipfsNodeForm
