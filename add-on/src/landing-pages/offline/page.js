'use strict'

const html = require('choo/html')

function createOfflinePage (i18n) {
  return function offlinePage (emit) {
    // Set translated title
    document.title = i18n.getMessage('page_landingOffline_title')

    return html`
    <div class="mw5 mw8-ns ph5-ns center pv5">
      <div class="fl w-30-ns w-100 tl mb4">
        <svg class="mw5" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 297 305"><path d="M.298 221.25L128.035 295l127.738-73.75V73.75L128.035.006.298 73.756V221.25z" fill="#4A9EA1"/><path d="M114.85 17.77L22.236 71.24a22.115 22.115 0 010 4.95l92.619 53.471a22.128 22.128 0 0126.272 0l92.62-53.473a22.068 22.068 0 01-.001-4.948L141.132 17.77a22.126 22.126 0 01-26.273 0h-.009zm127.789 73.19l-92.718 54.068a22.125 22.125 0 01-13.136 22.753l.104 106.349a22.108 22.108 0 014.286 2.475l92.62-53.472a22.123 22.123 0 0113.136-22.753V93.437a22.127 22.127 0 01-4.287-2.474l-.005-.003zm-229.207.594a22.114 22.114 0 01-4.286 2.475v106.944a22.125 22.125 0 0113.136 22.752l92.614 53.472a22.163 22.163 0 014.287-2.474V167.78a22.126 22.126 0 01-13.137-22.754L13.432 91.552v.003z" fill="#63D3D7"/><path d="M128.036 295l127.738-73.75V73.75L128.036 147.5V295z" fill="#000" fill-opacity=".251"/><path d="M128.036 295V147.5L.299 73.75v147.5L128.036 295z" fill="#000" fill-opacity=".039"/><path d="M.298 73.75l127.737 73.75 127.738-73.75L128.035 0 .298 73.75z" fill="#000" fill-opacity=".13"/><path d="M293.955 275.348l.003.005a19.504 19.504 0 01-16.87 29.239H164.791a19.496 19.496 0 01-16.863-9.756 19.502 19.502 0 01-.007-19.483l56.137-97.28.003-.004a19.477 19.477 0 0116.878-9.751 19.478 19.478 0 0116.881 9.755l56.135 97.275z" fill="#fff"/><path d="M287.301 279.188l-56.137-97.279a11.803 11.803 0 00-20.45 0l-56.136 97.279a11.813 11.813 0 00.004 11.808 11.818 11.818 0 0010.221 5.914h112.273a11.82 11.82 0 0010.225-17.722zm-60.825-1.334h-11.073v-11.073h11.073v11.073zm0-20.733h-11.073V213.15h11.073v43.971z" fill="#EA5037"/></svg>
      </div>
      <div class="fl w-70-ns w-100 pl4-ns">
        <h1 class="f2 montserrat fw6 mt0 tc tl-ns">${i18n.getMessage('page_landingOffline_head')}</h1>
        <h2 class="f3 fw6 mt0 mb2">${i18n.getMessage('page_landingOffline_subhead')}</h2>
        <h3 class="f4 fw4 mt0 monospace charcoal-muted" style="word-break:break-all;">window.location.hash123123123123123123123123123</h3>
        <p class="f4 fw4">${i18n.getMessage('page_landingOffline_gatewayOffline_text')}</p>
        <div class="tc tr-ns">
          <button class="f5 pv3 ph4 mh2 mb3 b white br2 bn bg-charcoal-muted hover-bg-charcoal pointer">${i18n.getMessage('page_landingOffline_gatewayOffline_updatePrefsButton_text')}</button>
          <button class="f5 pv3 ph4 mh2 mb3 b white br2 bn bg-teal-muted hover-bg-teal pointer">${i18n.getMessage('page_landingOffline_gatewayOffline_publicGatewayButton_text')}</button>
        </div>
        <p class="f4 fw4">${i18n.getMessage('page_landingOffline_dnsLinkGatewayUnavailable_text')}</p>
        <div class="tc tr-ns">
          <button class="f5 pv3 ph4 mh2 mb3 b white br2 bn bg-teal-muted hover-bg-teal pointer">${i18n.getMessage('page_landingOffline_dnsLinkGatewayUnavailable_useOriginalHostButton_text')}</button>
        </div>
        <p class="f4 fw4">${i18n.getMessage('page_landingOffline_dnsLinkHostUnavailable_text')}</p>
        <div class="tc tr-ns">
          <button class="f5 pv3 ph4 mh2 mb3 b white br2 bn bg-teal-muted hover-bg-teal pointer">${i18n.getMessage('page_landingOffline_dnsLinkHostUnavailable_useOriginalHostButton_text')}</button>
        </div>
      </div>
    </div>
    `
  }
}

module.exports = createOfflinePage
