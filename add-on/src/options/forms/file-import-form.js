'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function fileImportForm ({ importDir, onOptionChange }) {
  const onImportDirChange = onOptionChange('importDir')
  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_fileImport')}</legend>
        <div>
          <label for="importDir">
            <dl>
              <dt>${browser.i18n.getMessage('option_importDir_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_importDir_description')}
                <p><a href="https://docs.ipfs.io/guides/concepts/mfs/" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <input
            id="importDir"
            type="text"
            pattern="^\/(.*)"
            required
            onchange=${onImportDirChange}
            value=${importDir} />
        </div>
      </fieldset>
    </form>
  `
}

module.exports = fileImportForm
