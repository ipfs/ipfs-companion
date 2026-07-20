'use strict'

import choo from 'choo'
import html from 'choo/html/index.js'
import { i18n } from 'webextension-polyfill'
import {
  DNSLINK_UNDER_IPFS,
  IPNS_KEY_UNDER_IPFS,
  LOWERCASED_CIDV0,
  decodeDiagnosis
} from '../../lib/invalid-address.js'
import { nodeOffSvg } from '../welcome/page.js'
import './invalid-address.css'

const app = choo()

// How to write an address correctly in the first place. Offered for every
// reason, after whatever is specific to the mistake that was made.
const addressingDocs = {
  href: 'https://docs.ipfs.tech/how-to/address-ipfs-on-web/',
  label: 'invalid_address_page_learn_more'
}

// Copy for each reason, plus where to send someone who wants to understand it.
// A reason that offers a corrected address gets the comparison and the continue
// button; one that cannot be recovered gets advice instead.
const explanations = {
  [DNSLINK_UNDER_IPFS]: {
    header: 'invalid_address_page_wrong_namespace_header',
    message: 'invalid_address_page_dnslink_message',
    advice: 'invalid_address_page_namespace_advice',
    links: [
      { href: 'https://docs.ipfs.tech/concepts/dnslink/', label: 'invalid_address_page_learn_dnslink' },
      addressingDocs
    ]
  },
  [IPNS_KEY_UNDER_IPFS]: {
    header: 'invalid_address_page_wrong_namespace_header',
    message: 'invalid_address_page_ipns_key_message',
    advice: 'invalid_address_page_namespace_advice',
    links: [
      { href: 'https://docs.ipfs.tech/concepts/ipns/#mutability-in-ipfs', label: 'invalid_address_page_learn_mutability' },
      addressingDocs
    ]
  },
  [LOWERCASED_CIDV0]: {
    header: 'invalid_address_page_lowercased_header',
    message: 'invalid_address_page_lowercased_message',
    advice: 'invalid_address_page_lowercased_advice',
    links: [
      // nothing here can recover the CID, so point at the tool that turns the
      // original into a CIDv1 (Base32) the browser cannot damage
      { href: 'https://cid.ipfs.tech/', label: 'invalid_address_page_convert_cid' },
      addressingDocs
    ]
  }
}

const addressRow = (label, address, addressClass) => html`
  <div class="mb3 w-100">
    <p class="ma0 f6 fw6 ttu tracked charcoal-muted">${i18n.getMessage(label)}</p>
    <code class="db mt1 f5 word-wrap ${addressClass}">${address}</code>
  </div>
`

app.route('*', () => {
  const diagnosis = decodeDiagnosis(window.location.hash)

  // Reached with a fragment we did not write. There is nothing to explain, so
  // say so plainly rather than rendering an empty shell.
  if (!diagnosis) {
    return html`<div class="pa4 f4">${i18n.getMessage('invalid_address_page_sub_header')}</div>`
  }

  const { reason, address, suggestedAddress, suggestedUrl } = diagnosis
  const { header, message, advice, links } = explanations[reason]

  return html`<div class="flex flex-column flex-row-l">
    <div id="left-col" class="min-vh-100 flex flex-column justify-center items-center bg-navy white">
      <div class="mb4 flex flex-column justify-center items-center">
        ${nodeOffSvg(200)}
        <p class="mt0 mb0 f3 tc">${i18n.getMessage('invalid_address_page_sub_header')}</p>
      </div>
    </div>

    <div id="right-col" class="pt5 mt5 w-100 flex flex-column justify-around items-start">
      <h1 class="f3 fw5 mt0">${i18n.getMessage(header)}</h1>
      <p class="f5 fw4 lh-copy">${i18n.getMessage(message)}</p>

      ${addressRow('invalid_address_page_opened_label', address, 'red strike')}
      ${suggestedAddress ? addressRow('invalid_address_page_correct_label', suggestedAddress, 'green') : ''}

      <p class="f5 fw4 lh-copy">${i18n.getMessage(advice)}</p>

      ${suggestedUrl
        ? html`<a
            class="fade-in ba bw1 b--teal bg-teal snow no-underline f5 fw6 ph4 pv3 br2 mv3 pointer"
            href="${suggestedUrl}"
          >${i18n.getMessage('invalid_address_page_button', [suggestedAddress])} →</a>`
        : ''}

      <ul class="f5 fw2 pt4 pl0 list">
        ${links.map(({ href, label }) => html`
          <li class="mb2">
            <a class="navy link underline-under hover-aqua" href="${href}" target="_blank" rel="noopener noreferrer">
              ${i18n.getMessage(label)}
            </a>
          </li>
        `)}
      </ul>
    </div>
  </div>`
})

app.mount('#root')

document.title = i18n.getMessage('invalid_address_page_title')
