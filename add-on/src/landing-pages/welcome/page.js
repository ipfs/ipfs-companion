'use strict'

const html = require('choo/html')
const logo = require('../../popup/logo')
const { renderTranslatedLinks, renderTranslatedSpans } = require('../../utils/i18n')

// Assets
const libp2pLogo = '../../../images/libp2p.svg'
const multiformatsLogo = '../../../images/multiformats.svg'
const ipldLogo = '../../../images/ipld.svg'

// Colors
const colorIpfsLogo = '#57cbd0'
const colorWhite = '#ffffff'

function createWelcomePage (i18n) {
  return function welcomePage (state, emit) {
    const isIpfsOnline = state.isIpfsOnline
    const peerCount = state.peerCount
    const onOpenWebUi = () => emit('openWebUi')

    // Set translated title
    document.title = i18n.getMessage('page_landingWelcome_title')

    return html`
      <div class="flex flex-column flex-row-l">
        <div id="left-col" class="min-vh-100 flex flex-column justify-center items-center bg-navy white">
          ${renderCompanionLogo(i18n, isIpfsOnline)}
          ${isIpfsOnline ? renderWelcome(i18n, peerCount, onOpenWebUi) : renderInstallSteps(i18n, isIpfsOnline)}
        </div>

        <div id="right-col" class="min-vh-100 flex flex-column justify-around items-center">
          ${renderResources(i18n)}
          ${renderVideos(i18n)}
          ${renderProjects(i18n)}
        </div>
      </div>
    `
  }
}

/* ========================================================
   Render functions for the left side
   ======================================================== */

const renderCompanionLogo = (i18n, isIpfsOnline) => {
  const logoPath = '../../../icons'
  const logoSize = 128
  const stateUnknown = isIpfsOnline === null

  return html`
    <div class="mt4 mb4 flex flex-column justify-center items-center transition-all ${stateUnknown && 'state-unknown'}">
      ${logo({ path: logoPath, size: logoSize, isIpfsOnline: isIpfsOnline })}
      <p class="montserrat mt3 mb0 f2">${i18n.getMessage('page_landingWelcome_logo_title')}</p>
    </div>
  `
}

const renderWelcome = (i18n, peerCount, onOpenWebUi) => {
  const anchorClass = 'aqua hover-white'
  const copyClass = 'mv0 tc lh-copy f5'
  const svgWidth = 80

  const checkmarkSvg = () => html`
    <svg x="0px" y="0px" viewBox="0 0 84 84" width="${svgWidth}">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g transform="translate(-802.000000, -218.000000)">
          <g transform="translate(805.000000, 221.000000)">
            <rect stroke="${colorIpfsLogo}" stroke-width="5" x="0" y="0" width="78" height="78" rx="39"/>
            <g transform="translate(15.000000, 23.000000)" fill="${colorWhite}">
              <rect transform="translate(10.747845, 24.447908) scale(-1, -1) rotate(-135.000000) translate(-10.747845, -24.447908) " x="-1" y="21.4479076" width="23.495689" height="6" rx="3"/>
              <rect transform="translate(30.017983, 17.552092) scale(-1, -1) rotate(-45.000000) translate(-30.017983, -17.552092) " x="8.51798323" y="14.5520924" width="43" height="6" rx="3"/>
            </g>
          </g>
        </g>
      </g>
    </svg>
  `

  return html`
    <div class="w-80 flex flex-column justify-center">
      <div class="mb3 flex flex-column justify-center items-center">
        ${checkmarkSvg()}
        <p class="mt2 mb0 f3 tc">${renderTranslatedSpans('page_landingWelcome_welcome_peers', [peerCount], 'class="aqua fw6"')}</p>
      </div>
      <div class="mt3 f5 flex justify-center items-center">
        <button class="pv3 ph4 mh2 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${onOpenWebUi}>Status</button>
        <button class="pv3 ph4 mh2 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${onOpenWebUi}>Files</button>
        <button class="pv3 ph4 mh2 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${onOpenWebUi}>Peers</button>
      </div>
    </div>
  `
}

const renderInstallSteps = (i18n, isIpfsOnline) => {
  const copyClass = 'mv0 white f5 lh-copy'
  const anchorClass = 'aqua hover-white'
  const stateUnknown = isIpfsOnline === null

  return html`
    <div class="w-80 mt3 flex flex-column transition-all ${stateUnknown && 'state-unknown'}">
      <div class="mb4 flex flex-column justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="120" fill="#ffffff"><path d="M86.39 70.49L58.6 22.37a7.13 7.13 0 00-12.37 0L18.45 70.49a7.15 7.15 0 006.19 10.72H80.2a7.15 7.15 0 006.19-10.72zm-2.26 5.84a4.48 4.48 0 01-3.93 2.28H24.64a4.55 4.55 0 01-3.94-6.82l27.78-48.12a4.55 4.55 0 017.87 0l27.78 48.12a4.45 4.45 0 010 4.54z"/><path d="M55.16 64.24h-5.49a.76.76 0 00-.75.75v5.49a.76.76 0 00.75.75h5.49a.76.76 0 00.75-.75V65a.76.76 0 00-.75-.76zm-.75 5.49h-4v-4h4zm.75-32.02h-5.49a.76.76 0 00-.75.75v21.76a.76.76 0 00.75.75h5.49a.76.76 0 00.75-.75V38.46a.76.76 0 00-.75-.75zm-.75 21.76h-4V39.21h4z"/></svg>
        <p class="mt2 mb0 f3 tc">${i18n.getMessage('page_landingWelcome_installSteps_notRunning_title')}</p>
      </div>
      <p class="mb2 aqua b f4 lh-title">IPFS Desktop users</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_installSteps_desktop_install', ['https://github.com/ipfs-shipyard/ipfs-desktop#ipfs-desktop'], `target="_blank" class="${anchorClass}"`)}</p>
      <p class="mb2 aqua b f4 lh-title">${i18n.getMessage('page_landingWelcome_installSteps_cli_title')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_installSteps_cli_install', ['https://docs.ipfs.io/introduction/usage/'], `target="_blank" class="${anchorClass}"`)}</p>
    </div>
  `
}

/* ========================================================
   Render functions for the right side
   ======================================================== */

const renderResources = (i18n) => {
  const labelClass = 'ttu tracked f6 fw4 teal mt0 mb3'
  const copyClass = 'mt0 mb4 lh-copy'
  const anchorClass = 'link underline-under hover-aqua'

  return html`
    <div class="w-80 mv4 navy f5">
      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_new_ipfs')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_welcome_discover', ['https://github.com/ipfs-shipyard/ipfs-companion#features'], `target="_blank" class="${anchorClass}"`)}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_resources_new_ipfs', ['https://docs.ipfs.io', 'https://docs.ipfs.io/guides/concepts'], `target="_blank" class="${anchorClass}"`)}</p>

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_discover')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_resources_discover', ['https://awesome.ipfs.io', 'https://github.com/ipfs/ipfs#project-links'], `target="_blank" class="${anchorClass}"`)}</p>

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_got_questions')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_resources_got_questions', ['https://discuss.ipfs.io'], `target="_blank" class="${anchorClass}"`)}</p>

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_want_to_help')}</p>
      <p class="${copyClass} mv0">${renderTranslatedLinks('page_landingWelcome_resources_want_to_help', ['https://github.com/ipfs/community/#community', 'https://github.com/ipfs/ipfs#project-links', 'https://github.com/ipfs/docs', 'https://github.com/ipfs/i18n#ipfs-translation-project--%EF%B8%8F', 'https://discuss.ipfs.io/c/help'], `target="_blank" class="${anchorClass}"`)}</p>
    </div>
  `
}

const renderVideos = (i18n) => {
  const anchorClass = 'relative overflow-hidden br2 o-70 glow'
  const videoWidth = 240
  const videoHeight = 180

  const overlayDiv = () => html`
    <div class="absolute absolute--fill bg-navy o-70"></div>
  `

  const playSvg = () => html`
    <svg class="aspect-ratio--object" x="0px" y="0px" viewBox="-90 -60 ${videoWidth} ${videoHeight}">
      <g fill="${colorWhite}">
        <polygon points="43,30 23,40 23,20" />
      </g>
    </svg>
  `

  return html`
    <div class="w-80 flex flex-column flex-row-ns justify-between-ns aqua f5">
      <div class="flex flex-column mr1">
        <p class="ttu tracked f6 fw4 teal mt0 mb3">${i18n.getMessage('page_landingWelcome_videos_why_ipfs')}</p>
        <a class="${anchorClass}" style="height: ${videoHeight}px" href="https://www.youtube.com/watch?feature=player_embedded&v=zE_WSLbqqvo" target="_blank">
          <img width="${videoWidth}" height="${videoHeight}" src="https://ipfs.io/ipfs/QmS4Ae3WBzkaANSPD82Dsax8QuJQpS4TEfaC53FMPkdxMA" alt="${i18n.getMessage('page_landingWelcome_videos_why_ipfs')}" />
          ${overlayDiv()}
          ${playSvg()}
        </a>
      </div>

      <div class="flex flex-column">
        <p class="ttu tracked f6 fw4 teal mt0 mb3">${i18n.getMessage('page_landingWelcome_videos_how_ipfs_works')}</p>
        <a class="${anchorClass}" style="height: ${videoHeight}px" href="https://www.youtube.com/watch?feature=player_embedded&v=0IGzEYixJHk" target="_blank">
          <img width="${videoWidth}" height="${videoHeight}" src="https://ipfs.io/ipfs/QmP5uNwDjYZmoLxw8zJeeheSJEnBKYpFn4uuEQQWFYGKvM" alt="${i18n.getMessage('page_landingWelcome_videos_how_ipfs_works')}" />
          ${overlayDiv()}
          ${playSvg()}
        </a>
      </div>
    </div>
  `
}

const renderProjects = (i18n) => {
  const anchorClass = 'flex flex-column items-center navy link underline-under hover-aqua'
  const logoWidth = 80

  return html`
    <div class="w-80 mv4 navy f6">
      <p class="ttu tracked f6 fw4 teal mt0 mb3">${i18n.getMessage('page_landingWelcome_projects_title')}</p>

      <div class="flex justify-between-ns">
        <a class="${anchorClass}" href="https://multiformats.io/" target="_blank">
          <img width="${logoWidth}" src="${multiformatsLogo}" alt="Multiformats Logo">
          <p>Multiformats</p>
        </a>

        <a class="${anchorClass}" href="https://ipld.io/" target="_blank">
          <img width="${logoWidth}" src="${ipldLogo}" alt="IPLD Logo">
          <p>IPLD</p>
        </a>

        <a class="${anchorClass}" href="https://libp2p.io/" target="_blank">
        <img width="${logoWidth}" src="${libp2pLogo}" alt="libp2p Logo">
          <p>libp2p</p>
        </a>
      </div>
    </div>
  `
}

module.exports = createWelcomePage
