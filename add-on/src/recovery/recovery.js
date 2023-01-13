'use strict'
/* eslint-env browser, webextensions */

import choo from 'choo'
import html from 'choo/html/index.js'
import icon from 'ipfs-css/icons/stroke_attention.svg'
import browser, { i18n, runtime } from 'webextension-polyfill'
import { renderCompanionLogo } from '../landing-pages/welcome/page.js'
import createWelcomePageStore from '../landing-pages/welcome/store.js'
import { optionsPage } from '../lib/constants.js'
import './recovery.css'

const app = choo()

const learnMoreLink = html`<a class="no-underline" href="https://docs.ipfs.tech/how-to/companion-node-types/" target="_blank" rel="noopener noreferrer">${i18n.getMessage('recovery_page_learn_more')}</a>`

const optionsPageLink = html`<a class="no-underline" id="learn-more" href="${optionsPage}" target="_blank" rel="noopener noreferrer">${i18n.getMessage('recovery_page_update_preferences')}</a>`

// TODO (whizzzkid): refactor base store to be more generic.
app.use(createWelcomePageStore(i18n, runtime))
// Register our single route
app.route('*', (state) => {
  const { hash } = window.location
  const { href: publicURI } = new URL(decodeURIComponent(hash.slice(1)))
  const { version } = browser.runtime.getManifest()

  if (!publicURI) {
    return
  }

  const openURLFromHash = () => {
    try {
      console.log('Opening URL from hash:', publicURI)
      window.location.replace(publicURI)
    } catch (err) {
      console.error('Failed to open URL from hash:', err)
    }
  }

  // if the IPFS node is online, open the URL from the hash, this will redirect to the local node.
  if (state.isIpfsOnline) {
    openURLFromHash()
    return
  }

  return html`<div class="flex flex-column flex-row-l">
    <div id="left-col" class="min-vh-100 flex flex-column justify-center items-center bg-navy white">
      ${renderCompanionLogo(i18n, false)}
      <p class="montserrat mt3 mb0 f3">${version}</p>
    </div>

    <div id="right-col" class="pt4 w-100 flex flex-column justify-around items-center">
      <img src="${icon}" class="w4 h4" />
      <h1 class="f3 fw6">${i18n.getMessage('recovery_page_sub_header')}</h1>
      <p class="f3 fw5">${i18n.getMessage('recovery_page_message_p1')}</p>
      <p class="f4 fw4">${i18n.getMessage('recovery_page_message_p2')}</p>
      <p class="f4 fw4 w-100"><span class="b-ns">Public URL:</span> <a href="${publicURI}" rel="noopener noreferrer" target="_blank">${publicURI}</a></p>
      <button
        class="fade-in ba bw1 b--teal bg-teal snow f7 ph2 pv3 br4 ma1 pointer"
        onclick=${openURLFromHash}
        href="${publicURI}"
      >
        <span class="f5 fw6">${i18n.getMessage('recovery_page_button')}</span>
      </button>
      <p class="f5 fw2 pt6">
        ${learnMoreLink} | ${optionsPageLink}
      </span>
    </div>
  </div>`
})

// Start the application and render it to the given querySelector
app.mount('#root')

// Set page title and header translation
document.getElementById('header-text').innerText = i18n.getMessage('recovery_page_header')
document.title = i18n.getMessage('recovery_page_title')
