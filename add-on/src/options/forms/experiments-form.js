'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')
const switchToggle = require('../../pages/components/switch-toggle')

function experimentsForm ({
  displayNotifications,
  catchUnhandledProtocols,
  linkify,
  recoverFailedHttpRequests,
  detectIpfsPathHeader,
  ipfsProxy,
  logNamespaces,
  onOptionChange,
  onOptionsReset
}) {
  const onDisplayNotificationsChange = onOptionChange('displayNotifications')
  const onCatchUnhandledProtocolsChange = onOptionChange('catchUnhandledProtocols')
  const onLinkifyChange = onOptionChange('linkify')
  const onrecoverFailedHttpRequestsChange = onOptionChange('recoverFailedHttpRequests')
  const onDetectIpfsPathHeaderChange = onOptionChange('detectIpfsPathHeader')
  const onIpfsProxyChange = onOptionChange('ipfsProxy')

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
          <div>${switchToggle({ id: 'displayNotifications', checked: displayNotifications, onchange: onDisplayNotificationsChange })}</div>
        </div>
        <div>
          <label for="catchUnhandledProtocols">
            <dl>
              <dt>${browser.i18n.getMessage('option_catchUnhandledProtocols_title')}</dt>
              <dd>${browser.i18n.getMessage('option_catchUnhandledProtocols_description')}</dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'catchUnhandledProtocols', checked: catchUnhandledProtocols, onchange: onCatchUnhandledProtocolsChange })}</div>
        </div>
        <div>
          <label for="recoverFailedHttpRequests">
            <dl>
              <dt>${browser.i18n.getMessage('option_recoverFailedHttpRequests_title')}</dt>
              <dd>${browser.i18n.getMessage('option_recoverFailedHttpRequests_description')}</dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'recoverFailedHttpRequests', checked: recoverFailedHttpRequests, onchange: onrecoverFailedHttpRequestsChange })}</div>
        </div>
        <div>
          <label for="linkify">
            <dl>
              <dt>${browser.i18n.getMessage('option_linkify_title')}</dt>
              <dd>${browser.i18n.getMessage('option_linkify_description')}</dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'linkify', checked: linkify, onchange: onLinkifyChange })}</div>
        </div>
        <div>
          <label for="detectIpfsPathHeader">
            <dl>
              <dt>${browser.i18n.getMessage('option_detectIpfsPathHeader_title')}</dt>
              <dd>${browser.i18n.getMessage('option_detectIpfsPathHeader_description')}
                <p><a href="https://docs-beta.ipfs.io/how-to/companion-x-ipfs-path-header/" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'detectIpfsPathHeader', checked: detectIpfsPathHeader, onchange: onDetectIpfsPathHeaderChange })}</div>
        </div>
        <div class="o-50">
          <label for="ipfsProxy">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsProxy_title')}</dt>
              <dd>
                Disabled due to JS API migration
                <!-- TODO: https://github.com/ipfs-shipyard/ipfs-companion/pull/777
                ${browser.i18n.getMessage('option_ipfsProxy_description')}
                <p>${ipfsProxy ? html`
                    <a href="${browser.extension.getURL('dist/pages/proxy-acl/index.html')}" target="_blank">
                      ${browser.i18n.getMessage('option_ipfsProxy_link_manage_permissions')}
                    </a>` : html`<del>${browser.i18n.getMessage('option_ipfsProxy_link_manage_permissions')}</del>`}
                </p>
                -->
                <p><a href="https://docs-beta.ipfs.io/how-to/companion-window-ipfs/" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <div>${switchToggle({ id: 'ipfsProxy', checked: ipfsProxy, disabled: true, onchange: onIpfsProxyChange })}</div>
        </div>
        <div>
          <label for="logNamespaces">
            <dl>
              <dt>${browser.i18n.getMessage('option_logNamespaces_title')}</dt>
              <dd>${browser.i18n.getMessage('option_logNamespaces_description')}</dd>
            </dl>
          </label>
          <input
            id="logNamespaces"
            type="text"
            required
            onchange=${onOptionChange('logNamespaces')}
            value=${logNamespaces} />
        </div>
        <div>
          <label for="resetAllOptions">
            <dl>
              <dt>${browser.i18n.getMessage('option_resetAllOptions_title')}</dt>
              <dd>${browser.i18n.getMessage('option_resetAllOptions_description')}</dd>
            </dl>
          </label>
          <div><button id="resetAllOptions" onclick=${onOptionsReset}>${browser.i18n.getMessage('option_resetAllOptions_title')}</button></div>
        </div>
      </fieldset>
    </form>
  `
}

module.exports = experimentsForm
