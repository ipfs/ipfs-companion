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
  const anchorClass = 'white link underline-under hover-aqua'
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
      <div class="mb4 flex flex-column justify-center items-center">
        ${checkmarkSvg()}
        <p class="mt2 mb0 f3">${i18n.getMessage('page_landingWelcome_welcome_title')}</p>
      </div>
      <p class="${copyClass}">${renderTranslatedSpans('page_landingWelcome_welcome_peers', [peerCount], 'class="aqua fw6"')}</p>
      <p class="${copyClass} mb4">${renderTranslatedLinks('page_landingWelcome_welcome_discover', ['https://github.com/ipfs-shipyard/ipfs-companion#features'], `target="_blank" class="${anchorClass}"`)}</p>
      <div class="mt4 f5 flex justify-center items-center">
        <button class="pv3 ph4 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${onOpenWebUi}>${i18n.getMessage('panel_openWebui')}</button>
      </div>
    </div>
  `
}

const renderInstallSteps = (i18n, isIpfsOnline) => {
  const copyClass = 'mv0 white f5 lh-copy'
  const anchorClass = 'white link underline-under hover-aqua'
  const stateUnknown = isIpfsOnline === null

  return html`
    <div class="w-80 mt3 flex flex-column transition-all ${stateUnknown && 'state-unknown'}">
      <p class="mt0 mb2 yellow f4 lh-title">${i18n.getMessage('page_landingWelcome_installSteps_notRunning_title')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_installSteps_desktop_install', ['https://github.com/ipfs-shipyard/ipfs-desktop#ipfs-desktop'], `target="_blank" class="${anchorClass}"`)}</p>
      <p class="mb2 yellow f4 lh-title">${i18n.getMessage('page_landingWelcome_installSteps_cli_title')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_installSteps_cli_install', ['https://docs.ipfs.io/introduction/usage/'], `target="_blank" class="${anchorClass}"`)}</p>
      <div className='db w-100 mw6 mv3 pa3 bg-black-70 bt bw4 br2 snow f7'>
        <code className='db'>$ ipfs daemon</code>
        <code className='db'>Initializing daemon...</code>
        <code className='db'>API server listening on /ip4/127.0.0.1/tcp/5001</code>
      </div>
    </div>
  `
}

/* ========================================================
   Render functions for the right side
   ======================================================== */

const renderResources = (i18n) => {
  const labelClass = 'aqua mb1'
  const copyClass = 'mt0 mb4 lh-copy'
  const anchorClass = 'navy link underline-under hover-aqua'

  return html`
    <div class="w-80 mv4 navy f5">
      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_new_ipfs')}</p>
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
        <p>${i18n.getMessage('page_landingWelcome_videos_alpha_demo')}</p>
        <a class="${anchorClass}" style="height: ${videoHeight}px" href="https://www.youtube.com/watch?feature=player_embedded&v=8CMxDNuuAiQ" target="_blank">
          <img width="${videoWidth}" height="${videoHeight}" src="https://ipfs.io/ipfs/zb2rhoo8LXEwek8HLLYsXhra9YuYxRDEun3rHRc18mLvK3A5w" alt="${i18n.getMessage('page_landingWelcome_videos_alpha_demo')}" />
          ${overlayDiv()}
          ${playSvg()}
        </a>
      </div>

      <div class="flex flex-column">
        <p>${i18n.getMessage('page_landingWelcome_videos_permanent_web')}</p>
        <a class="${anchorClass}" style="height: ${videoHeight}px" href="https://www.youtube.com/watch?feature=player_embedded&v=HUVmypx9HGI" target="_blank">
          <img width="${videoWidth}" height="${videoHeight}" src="https://ipfs.io/ipfs/zb2rhbCqh6W5Veot1sgZC5v7oLMnrkxq8ikd7auyy9UKSLBBa" alt="${i18n.getMessage('page_landingWelcome_videos_permanent_web')}" />
          ${overlayDiv()}
          ${playSvg()}
        </a>
      </div>
    </div>
  `
}

const renderProjects = (i18n) => {
  const anchorClass = 'flex flex-column items-center navy link hover-aqua'
  const logoWidth = 80

  return html`
    <div class="w-80 mv4 navy f6">
      <p class="mb4 aqua f5">${i18n.getMessage('page_landingWelcome_projects_title')}</p>

      <div class="flex justify-between-ns">
        <a class="${anchorClass}" href="https://multiformats.io/" target="_blank">
          <img width="${logoWidth}" src="${multiformatsLogo}" alt="Multiformats Logo">
          <p>multiformats.io</p>
        </a>

        <a class="${anchorClass}" href="https://ipld.io/" target="_blank">
          <img width="${logoWidth}" src="${ipldLogo}" alt="IPLD Logo">
          <p>ipld.io</p>
        </a>

        <a class="${anchorClass}" href="https://libp2p.io/" target="_blank">
        <img width="${logoWidth}" src="${libp2pLogo}" alt="libp2p Logo">
          <p>libp2p.io</p>
        </a>
      </div>
    </div>
  `
}

module.exports = createWelcomePage
