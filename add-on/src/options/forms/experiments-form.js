'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function experimentsForm ({
  displayNotifications,
  preloadAtPublicGateway,
  catchUnhandledProtocols,
  linkify,
  dnslink,
  onOptionChange,
  onOptionsReset
}) {
  const onDisplayNotificationsChange = onOptionChange('displayNotifications')
  const onPreloadAtPublicGatewayChange = onOptionChange('preloadAtPublicGateway')
  const onCatchUnhandledProtocolsChange = onOptionChange('catchUnhandledProtocols')
  const onLinkifyChange = onOptionChange('linkify')
  const onDnsLinkChange = onOptionChange('dnslink')

  return html`
    <form>
      <fieldset>
        <legend>${browser.i18n.getMessage('option_header_experiments')}</legend>
        <div>${browser.i18n.getMessage('option_experiments_warning')}</div>
        <div>
          <label for="displayNotifications">
            <dl>
              <dt>${browser.i18n.getMessage('option_displayNotifications_title')}</dt>
              <dd>${browser.i18n.getMessage('option_displayNotifications_description')}</dd>
            </dl>
          </label>
          <input id="displayNotifications" type="checkbox" onchange=${onDisplayNotificationsChange} checked=${displayNotifications} />
        </div>
        <div>
          <label for="preloadAtPublicGateway">
            <dl>
              <dt>${browser.i18n.getMessage('option_preloadAtPublicGateway_title')}</dt>
              <dd>${browser.i18n.getMessage('option_preloadAtPublicGateway_description')}</dd>
            </dl>
          </label>
          <input type="checkbox" id="preloadAtPublicGateway" onchange=${onPreloadAtPublicGatewayChange} checked=${preloadAtPublicGateway} />
        </div>
        <div>
          <label for="catchUnhandledProtocols">
            <dl>
              <dt>${browser.i18n.getMessage('option_catchUnhandledProtocols_title')}</dt>
              <dd>${browser.i18n.getMessage('option_catchUnhandledProtocols_description')}</dd>
            </dl>
          </label>
          <input type="checkbox" id="catchUnhandledProtocols" onchange=${onCatchUnhandledProtocolsChange} checked=${catchUnhandledProtocols} />
        </div>
        <div>
          <label for="linkify">
            <dl>
              <dt>${browser.i18n.getMessage('option_linkify_title')}</dt>
              <dd>${browser.i18n.getMessage('option_linkify_description')}</dd>
            </dl>
          </label>
          <input type="checkbox" id="linkify" onchange=${onLinkifyChange} checked=${linkify} />
        </div>
        <div>
          <label for="dnslink">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslink_title')}</dt>
              <dd>${browser.i18n.getMessage('option_dnslink_description')}</dd>
            </dl>
          </label>
          <input type="checkbox" id="dnslink" onchange=${onDnsLinkChange} checked=${dnslink} />
        </div>
        <div>
          <label for="resetAllOptions">
            <dl>
              <dt>${browser.i18n.getMessage('option_resetAllOptions_title')}</dt>
              <dd>${browser.i18n.getMessage('option_resetAllOptions_description')}</dd>
            </dl>
          </label>
          <span id="resetAllOptions"><button onclick=${onOptionsReset}>${browser.i18n.getMessage('option_resetAllOptions_title')}</button></span>
        </div>
      </fieldset>
    </form>
  `
}

module.exports = experimentsForm
