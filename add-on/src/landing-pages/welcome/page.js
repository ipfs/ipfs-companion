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
const colorYellow = '#f39021'

function createWelcomePage (i18n) {
  return function welcomePage (state, emit) {
    const { isIpfsOnline, peerCount } = state
    const openWebUi = (page) => () => emit('openWebUi', page)

    // Set translated title
    document.title = i18n.getMessage('page_landingWelcome_title')

    return html`
      <div class="flex flex-column flex-row-l">
        <div id="left-col" class="min-vh-100 flex flex-column justify-center items-center bg-navy white">
          ${renderCompanionLogo(i18n, isIpfsOnline)}
          ${isIpfsOnline ? renderWelcome(i18n, peerCount, openWebUi) : renderInstallSteps(i18n, isIpfsOnline)}
        </div>

        <div id="right-col" class="min-vh-100 w-100 flex flex-column justify-around items-center">
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
    <div class="mt4 mb2 flex flex-column justify-center items-center transition-all ${stateUnknown && 'state-unknown'}">
      ${logo({ path: logoPath, size: logoSize, isIpfsOnline: isIpfsOnline })}
      <p class="montserrat mt3 mb0 f2">${i18n.getMessage('page_landingWelcome_logo_title')}</p>
    </div>
  `
}

const renderWelcome = (i18n, peerCount, openWebUi) => {
  // const anchorClass = 'aqua hover-white'
  // const copyClass = 'mv0 tc lh-copy f5'
  const svgWidth = 130

  const nodeOnSvg = () => html`
    <svg x="0px" y="0px" viewBox="0 0 100 100" width="${svgWidth}">
      <path fill="${colorIpfsLogo}" d="M52.42 18.81A31.19 31.19 0 1083.6 50a31.22 31.22 0 00-31.18-31.19zm0 59.78A28.59 28.59 0 1181 50a28.62 28.62 0 01-28.58 28.59z"/>
      <path fill="${colorWhite}" d="M66.49 35.87a.75.75 0 00-1.06 0L46.6 54.7l-7.2-7.2a.75.75 0 00-1.06 0l-3.92 3.92a.75.75 0 000 1.06l11.65 11.65a.75.75 0 001.06 0l23.28-23.28a.74.74 0 000-1.06zM46.6 62.54L36 52l2.86-2.86 7.2 7.2a.75.75 0 001.06 0L66 37.46l2.86 2.86z"/>
    </svg>
  `

  return html`
    <div class="w-80 flex flex-column justify-center">
      <div class="mb3 flex flex-column justify-center items-center">
        ${nodeOnSvg()}
        <p class="mt0 mb0 f3 tc">${renderTranslatedSpans('page_landingWelcome_welcome_peers', [peerCount], 'class="aqua fw6"')}</p>
      </div>
      <div class="mt3 f5 flex justify-center items-center">
        <button class="pv3 ph4 mh2 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${openWebUi('/')}>${i18n.getMessage('page_landingWelcome_welcome_statusButton_text')}</button>
        <button class="pv3 ph4 mh2 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${openWebUi('/files')}>${i18n.getMessage('page_landingWelcome_welcome_filesButton_text')}</button>
        <button class="pv3 ph4 mh2 b navy br2 bn bg-white hover-bg-white-90 pointer" onclick=${openWebUi('/peers')}>${i18n.getMessage('page_landingWelcome_welcome_peersButton_text')}</button>
      </div>
    </div>
  `
}

const renderInstallSteps = (i18n, isIpfsOnline) => {
  const copyClass = 'mv0 white f5 lh-copy'
  const anchorClass = 'aqua hover-white'
  const stateUnknown = isIpfsOnline === null
  const svgWidth = 130

  const nodeOffSvg = () => html`
    <svg x="0px" y="0px" viewBox="0 0 100 100" width="${svgWidth}">
      <path fill="${colorYellow}" d="M82.84 71.14L55.06 23a5.84 5.84 0 00-10.12 0L17.16 71.14a5.85 5.85 0 005.06 8.77h55.56a5.85 5.85 0 005.06-8.77zm-30.1-.66h-5.48V65h5.48zm0-10.26h-5.48V38.46h5.48z"/>
    </svg>
  `

  return html`
    <div class="w-80 mt0 flex flex-column transition-all ${stateUnknown && 'state-unknown'}">
      <div class="mb4 flex flex-column justify-center items-center">
        ${nodeOffSvg()}
        <p class="mt0 mb0 f3 tc">${i18n.getMessage('page_landingWelcome_installSteps_notRunning_title')}</p>
      </div>
      <p class="mb2 aqua b f4 lh-title">${i18n.getMessage('page_landingWelcome_installSteps_desktop_title')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_installSteps_desktop_install', ['https://github.com/ipfs-shipyard/ipfs-desktop#ipfs-desktop'], `target="_blank" class="${anchorClass}"`)}</p>
      <p class="mb2 aqua b f4 lh-title">${i18n.getMessage('page_landingWelcome_installSteps_cli_title')}</p>
      <p class="${copyClass}">${renderTranslatedLinks('page_landingWelcome_installSteps_cli_install', ['https://docs.ipfs.io/how-to/command-line-quick-start/'], `target="_blank" class="${anchorClass}"`)}</p>
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
    <div class="w-80 mt4 mb0 navy f5">

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_new_ipfs')}</p>
      <ul class="${copyClass}">
        <li>${renderTranslatedLinks('page_landingWelcome_resources_new_ipfs_companion_features', ['https://github.com/ipfs-shipyard/ipfs-companion#features'], `target="_blank" class="${anchorClass}"`)}</li>
        <li>${renderTranslatedLinks('page_landingWelcome_resources_new_ipfs_concepts', ['https://docs.ipfs.io/concepts/how-ipfs-works/'], `target="_blank" class="${anchorClass}"`)}</li>
        <li>${renderTranslatedLinks('page_landingWelcome_resources_new_ipfs_docs', ['https://docs.ipfs.io'], `target="_blank" class="${anchorClass}"`)}</li>
      </ul>

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_build')}</p>
      <ul class="${copyClass}">
        <li>${renderTranslatedLinks('page_landingWelcome_resources_build_tutorials', ['https://docs.ipfs.io/how-to/'], `target="_blank" class="${anchorClass}"`)}</li>
        <li>${renderTranslatedLinks('page_landingWelcome_resources_build_examples', ['https://awesome.ipfs.io'], `target="_blank" class="${anchorClass}"`)}</li>
      </ul>

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_get_help')}</p>
      <ul class="${copyClass}">
        <li>${renderTranslatedLinks('page_landingWelcome_resources_get_help', ['https://discuss.ipfs.io'], `target="_blank" class="${anchorClass}"`)}</li>
      </ul>

      <p class="${labelClass}">${i18n.getMessage('page_landingWelcome_resources_title_community')}</p>
      <ul class="${copyClass}">
        <li>${renderTranslatedLinks('page_landingWelcome_resources_community_contribute', ['https://docs.ipfs.io/community/contribute/ways-to-contribute/'], `target="_blank" class="${anchorClass}"`)}</li>
        <li>${renderTranslatedLinks('page_landingWelcome_resources_community_translate', ['https://www.transifex.com/ipfs/public/'], `target="_blank" class="${anchorClass}"`)}</li>
        <li>${renderTranslatedLinks('page_landingWelcome_resources_community_resources', ['https://docs.ipfs.io/community/'], `target="_blank" class="${anchorClass}"`)}</li>
    </ul>
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
