'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import switchToggle from '../../pages/components/switch-toggle.js'

export default function telemetryForm ({
  onOptionChange,
  stateOptions
}) {
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
              <dd>${browser.i18n.getMessage('option_telemetryGroupMinimal_description')}</dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'telemetryGroupMinimal', checked: stateOptions.telemetryGroupMinimal, onchange: onOptionChange('telemetryGroupMinimal') })}</div>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="telemetryGroupMarketing">
            <dl>
              <dt>${browser.i18n.getMessage('option_telemetryGroupMarketing_title')}</dt>
              <dd>${browser.i18n.getMessage('option_telemetryGroupMarketing_description')}</dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'telemetryGroupMarketing', checked: stateOptions.telemetryGroupMarketing, onchange: onOptionChange('telemetryGroupMarketing') })}</div>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="telemetryGroupPerformance">
            <dl>
              <dt>${browser.i18n.getMessage('option_telemetryGroupPerformance_title')}</dt>
              <dd>${browser.i18n.getMessage('option_telemetryGroupPerformance_description')}</dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'telemetryGroupPerformance', checked: stateOptions.telemetryGroupPerformance, onchange: onOptionChange('telemetryGroupPerformance') })}</div>
        </div>
        <div class="flex-row-ns pb0-ns">
          <label for="telemetryGroupTracking">
            <dl>
              <dt>${browser.i18n.getMessage('option_telemetryGroupTracking_title')}</dt>
              <dd>${browser.i18n.getMessage('option_telemetryGroupTracking_description')}</dd>
            </dl>
          </label>
          <div class="self-center-ns">${switchToggle({ id: 'telemetryGroupTracking', checked: stateOptions.telemetryGroupTracking, onchange: onOptionChange('telemetryGroupTracking') })}</div>
        </div>
      </fieldset>
    </form>
  `
}
