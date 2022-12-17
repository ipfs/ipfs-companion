'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import switchToggle from '../../pages/components/switch-toggle.js'

export default function telemetryForm ({
  onOptionChange,
  ...stateOptions
}) {
  // const onTelemetryChange = (key) => {

  // }
  return html`
    <form>
      <fieldset class="mb3 pa1 pa4-ns pa3 bg-snow-muted charcoal">
        <h2 class="ttu tracked f6 fw4 teal mt0-ns mb3-ns mb1 mt2 ">${browser.i18n.getMessage('option_header_telemetry')}</h2>
        <div class="mb2">
          <p>${browser.i18n.getMessage('option_telemetry_disclaimer')}</p>
          <p>
            <a class="link underline hover-aqua" href="https://github.com/ipfs/ipfs-gui/issues/125" target="_blank">
              ${browser.i18n.getMessage('option_legend_readMore')}
            </a>
          </p>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="telemetryGroupMinimal">
            <dl>
              <dt>${browser.i18n.getMessage('option_telemetryGroupMinimal_title')}</dt>
              <dd>
                <p>${browser.i18n.getMessage('option_telemetryGroupMinimal_description')}</p>
                <p>${browser.i18n.getMessage('option_telemetryGroupMinimal_session_description')}</p>
                <p>${browser.i18n.getMessage('option_telemetryGroupMinimal_view_description')}</p>
              </dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'telemetryGroupMinimal', checked: stateOptions.telemetryGroupMinimal, onchange: onOptionChange('telemetryGroupMinimal') })}</div>
        </div>
      </fieldset>
    </form>
  `
}
