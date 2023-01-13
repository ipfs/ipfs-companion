'use strict'
/* eslint-env browser, webextensions */

import choo from 'choo'
import html from 'choo/html/index.js'
import { i18n, runtime } from 'webextension-polyfill'
import { renderLogo } from '../landing-pages/welcome/page.js'
import createWelcomePageStore from '../landing-pages/welcome/store.js'
import './recovery.css'

const app = choo()

// TODO (whizzzkid): refactor base store to be more generic.
app.use(createWelcomePageStore(i18n, runtime))
// Register our single route
app.route('*', (state) => {
  const { hash } = window.location
  const { href: publicURI } = new URL(decodeURIComponent(hash.slice(1)))
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

  return html`<div class="recovery-root flex justify-center items-center">
    <div class="flex w-70">
      <div class="ma2 flex w-third flex-column transition-all">
        ${renderLogo(false, 256)}
      </div>
      <div class="ma2 flex flex-column transition-all">
        <h1 class="f3 fw6">${i18n.getMessage('recovery_page_sub_header')}</h1>
        <p class="f5 fw4">${i18n.getMessage('recovery_page_message')}</p>
        <p class="f5 fw4"><span class="b-ns">Public URI:</span> <a href="${publicURI}">${publicURI}</a></p>
        <button
          class="fade-in w-50 ba bw1 b--aqua bg-aqua snow f7 ph2 pv3 br4 ma1 pointer"
          onclick=${openURLFromHash}
          href="${publicURI}"
        >
          <span class="f5 fw6">${i18n.getMessage('recovery_page_button')}</span>
        </button>
      </div>
    </div>
  </div>`
})

// Start the application and render it to the given querySelector
app.mount('#root')

// Set page title and header translation
document.getElementById('header-text').innerText = i18n.getMessage('recovery_page_header')
console.log(document.getElementById('learn-more'))
document.getElementById('learn-more').innerText = i18n.getMessage('recovery_page_learn_more')
document.title = i18n.getMessage('recovery_page_title')
