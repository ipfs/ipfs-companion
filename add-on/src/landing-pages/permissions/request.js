'use strict'
/* eslint-env browser, webextensions */

import choo from 'choo'
import html from 'choo/html/index.js'
import { i18n, runtime } from 'webextension-polyfill'
import { nodeOffSvg } from '../welcome/page.js'
import createWelcomePageStore from '../welcome/store.js'
import { optionsPage } from '../../lib/constants.js'
import './request.css'

const app = choo()

const learnMoreLink = html`<a class="navy link underline-under hover-aqua" href="https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/host_permissions#requested_permissions_and_user_prompts" target="_blank" rel="noopener noreferrer">${i18n.getMessage('request_permissions_page_learn_more')}</a>`

const optionsPageLink = html`<a class="navy link underline-under hover-aqua" id="learn-more" href="${optionsPage}" target="_blank" rel="noopener noreferrer">${i18n.getMessage('recovery_page_update_preferences')}</a>`

// TODO (whizzzkid): refactor base store to be more generic.
app.use(createWelcomePageStore(i18n, runtime))
// Register our single route
app.route('*', (state) => {
  browser.runtime.sendMessage({ telemetry: { trackView: 'recovery' } })
  const requestPermission = async () => {
    await browser.permissions.request({ origins: ['<all_urls>'] })
    browser.runtime.reload()
  }

  return html`<div class="flex flex-column flex-row-l">
    <div id="left-col" class="min-vh-100 flex flex-column justify-center items-center bg-navy white">
      <div class="mb4 flex flex-column justify-center items-center">
        ${nodeOffSvg(200)}
        <p class="mt0 mb0 f3 tc">${i18n.getMessage('request_permissions_page_sub_header')}</p>
      </div>
    </div>

    <div id="right-col" class="pt7 mt5 w-100 flex flex-column justify-around items-center">
      <p class="f3 fw5">${i18n.getMessage('request_permissions_page_message_p1')}</p>
      <p class="f4 fw4">${i18n.getMessage('request_permissions_page_message_p2')}</p>
      <button
        class="fade-in ba bw1 b--teal bg-teal snow f7 ph2 pv3 br2 ma4 pointer"
        onclick=${requestPermission}
      >
        <span class="f5 fw6">${i18n.getMessage('request_permissions_page_button')}</span>
      </button>
      <p class="f5 fw2 pt5">
        ${learnMoreLink} | ${optionsPageLink}
      </span>
    </div>
  </div>`
})

// Start the application and render it to the given querySelector
app.mount('#root')

// Set page title and header translation
document.title = i18n.getMessage('request_permissions_page_title')
