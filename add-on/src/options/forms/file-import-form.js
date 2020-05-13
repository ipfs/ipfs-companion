'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function fileImportForm ({ importDir, openViaWebUI, preloadAtPublicGateway, onOptionChange }) {
  const onImportDirChange = onOptionChange('importDir')
  const onOpenViaWebUIChange = onOptionChange('openViaWebUI')
  const onPreloadAtPublicGatewayChange = onOptionChange('preloadAtPublicGateway')
  return html`
    <form>
      <fieldset class="mb3 pa4 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0 mb3">${browser.i18n.getMessage('option_header_fileImport')}</h2>
        <div>
          <label for="importDir">
            <dl>
              <dt>${browser.i18n.getMessage('option_importDir_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_importDir_description')}
                <p><a href="https://docs-beta.ipfs.io/concepts/file-systems/#mutable-file-system-mfs" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <input
            class="bg-navy white"
            id="importDir"
            type="text"
            pattern="^\/(.*)"
            required
            onchange=${onImportDirChange}
            value=${importDir} />
        </div>
        <div>
          <label for="openViaWebUI">
            <dl>
              <dt>${browser.i18n.getMessage('option_openViaWebUI_title')}</dt>
              <dd>${browser.i18n.getMessage('option_openViaWebUI_description')}</dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'openViaWebUI', checked: openViaWebUI, onchange: onOpenViaWebUIChange })}</div>
        </div>
        <div>
          <label for="preloadAtPublicGateway">
            <dl>
              <dt>${browser.i18n.getMessage('option_preloadAtPublicGateway_title')}</dt>
              <dd>${browser.i18n.getMessage('option_preloadAtPublicGateway_description')}</dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'preloadAtPublicGateway', checked: preloadAtPublicGateway, onchange: onPreloadAtPublicGatewayChange })}</div>
        </div>
      </fieldset>
    </form>
  `
}

module.exports = fileImportForm
