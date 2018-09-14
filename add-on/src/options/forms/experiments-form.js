'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const html = require('choo/html')

function experimentsForm ({
  displayNotifications,
  preloadAtPublicGateway,
  catchUnhandledProtocols,
  linkify,
  dnslinkPolicy,
  detectIpfsPathHeader,
  ipfsProxy,
  onOptionChange,
  onOptionsReset
}) {
  const onDisplayNotificationsChange = onOptionChange('displayNotifications')
  const onPreloadAtPublicGatewayChange = onOptionChange('preloadAtPublicGateway')
  const onCatchUnhandledProtocolsChange = onOptionChange('catchUnhandledProtocols')
  const onLinkifyChange = onOptionChange('linkify')
  const onDnslinkPolicyChange = onOptionChange('dnslinkPolicy')
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
          <label for="dnslinkPolicy">
            <dl>
              <dt>${browser.i18n.getMessage('option_dnslinkPolicy_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_dnslinkPolicy_description')}
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/dnslink.md#dnslink-support-in-ipfs-companion" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <select id="dnslinkPolicy" name='dnslinkPolicy' onchange=${onDnslinkPolicyChange}>
            <option
              value='false'
              selected=${String(dnslinkPolicy) === 'false'}>
              ${browser.i18n.getMessage('option_dnslinkPolicy_disabled')}
            </option>
            <option
              value='best-effort'
              selected=${dnslinkPolicy === 'best-effort'}>
              ${browser.i18n.getMessage('option_dnslinkPolicy_bestEffort')}
            </option>
            <option
              value='enabled'
              selected=${dnslinkPolicy === 'enabled'}>
              ${browser.i18n.getMessage('option_dnslinkPolicy_enabled')}
            </option>
          </select>
        </div>
        <div>
          <label for="detectIpfsPathHeader">
            <dl>
              <dt>${browser.i18n.getMessage('option_detectIpfsPathHeader_title')}</dt>
              <dd>${browser.i18n.getMessage('option_detectIpfsPathHeader_description')}
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/x-ipfs-path-header.md#x-ipfs-path-header-support-in-ipfs-companion" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <input type="checkbox" id="detectIpfsPathHeader" onchange=${onDetectIpfsPathHeaderChange} checked=${detectIpfsPathHeader} />
        </div>
        <div>
          <label for="ipfs-proxy">
            <dl>
              <dt>${browser.i18n.getMessage('option_ipfsProxy_title')}</dt>
              <dd>
                ${browser.i18n.getMessage('option_ipfsProxy_description')}
                <p>${ipfsProxy ? html`
                    <a href="${browser.extension.getURL('dist/pages/proxy-acl/index.html')}" target="_blank">
                      ${browser.i18n.getMessage('option_ipfsProxy_link_manage_permissions')}
                    </a>` : html`<del>${browser.i18n.getMessage('option_ipfsProxy_link_manage_permissions')}</del>`}
                </p>
                <p><a href="https://github.com/ipfs-shipyard/ipfs-companion/blob/master/docs/window.ipfs.md#notes-on-exposing-ipfs-api-as-windowipfs" target="_blank">
                  ${browser.i18n.getMessage('option_legend_readMore')}
                </a></p>
              </dd>
            </dl>
          </label>
          <input type="checkbox" id="ipfs-proxy" onchange=${onIpfsProxyChange} checked=${ipfsProxy} />
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
