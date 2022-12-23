'use strict'
/* eslint-env browser, webextensions */

import choo from 'choo'
import html from 'choo/html/index.js'
import { renderCompanionLogo } from '../landing-pages/welcome/page.js'
import createWelcomePageStore from '../landing-pages/welcome/store.js'
import { i18n, runtime } from 'webextension-polyfill'
import './recovery.css'

const app = choo()

// TODO (whizzzkid): refactor base store to be more generic.
app.use(createWelcomePageStore(i18n, runtime));
// Register our single route
app.route('*', (state) => {
  console.log(state)
  const openURLFromHash = () => {
    const { hash } = window.location;
    try {
      const url = new URL(decodeURI(hash.slice(1)));
      console.log('Opening URL from hash:', url.href);
      window.location.href = url.href;
    } catch (err) {
      console.error('Failed to open URL from hash:', err);
    }
  }

  return html`<div class="recovery-root">
    ${renderCompanionLogo(i18n, false)}
    <p class="f6 fw4">${i18n.getMessage('recovery_page_message')}</p>
    <button class="fade-in w-40 ba bw1 b--navy bg-navy snow f7 ph2 pv3 br4 ma1 pointer" onclick=${openURLFromHash}>
      <span class="f6 fw4">${i18n.getMessage('recovery_page_button')}</span>
    </button>
  </div>`
})

// Start the application and render it to the given querySelector
app.mount('#root')

// Set page title and header translation
document.getElementById('header-text').innerText = i18n.getMessage('recovery_page_header')
document.title = i18n.getMessage('recovery_page_title')
