'use strict'

const html = require('choo/html')

// Assets
const ipfsLogo = '../../../icons/ipfs-logo-on.svg'
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

    return html`
      <div class="flex flex-column flex-row-l">
        <div id="hero" class="w-100 min-vh-100 flex flex-column justify-center items-center bg-navy white">
          ${renderCompanionLogo()}
          ${isIpfsOnline ? renderWelcome(peerCount) : renderInstallSteps()}
        </div>

        <div class="w-100 min-vh-100 flex flex-column justify-around items-center">
          ${renderResources()}
          ${renderVideos()}
          ${renderProjects()}
        </div>
      </div>
    `
  }
}

/* ========================================================
   Render functions for the left side
   ======================================================== */

const renderCompanionLogo = () => {
  const ipfsLogoWidth = 128

  return html`
    <div class="mb5 flex flex-column justify-center items-center">
      <img width="${ipfsLogoWidth}" src="${ipfsLogo}" alt="IPFS Logo">
      <p class="mt3 mb0 b f2">IPFS Companion</p>
    </div>
  `
}

const renderWelcome = (peerCount) => {
  const anchorClass = 'white link underline-under hover-aqua'
  const copyClass = 'mv0 lh-copy f5'
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
        <p class="mt2 mb0 f3">You are all set!</p>
      </div>
      <p class="${copyClass}">Right now your node is connected to <span class="aqua">${peerCount}</span> peers.</p>
      <p class="${copyClass}">Discover what you <a class="${anchorClass}" href="https://github.com/ipfs-shipyard/ipfs-companion#features" target="_blank">can do with Companion</a> and dive into the distributed web with IPFS!</p>
    </div>
  `
}

const renderInstallSteps = () => {
  const copyClass = 'mv0 white f5 lh-copy'
  const anchorClass = 'white link underline-under hover-aqua'

  return html`
    <div class="w-80 mt4 flex flex-column">
      <p class="mt0 mb2 yellow f4 lh-title">Is your IPFS daemon running?</p>
      <p class="${copyClass}">If you haven't installed IPFS please do so <a class="${anchorClass}" href="https://ipfs.io/docs/getting-started/" target="_blank">with these instructions</a>.</p>
      <p class="${copyClass}">Then make sure to have an IPFS daemon running in your terminal:</p>
      <div className='db w-100 mt3 pa3 bg-black-70 bt bw4 br2 snow f7'>
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

const renderResources = () => {
  const labelClass = 'aqua mb1'
  const copyClass = 'mt0 mb4 lh-copy'
  const anchorClass = 'navy link underline-under hover-aqua'

  return html`
    <div class="w-80 navy f5">
      <p class="${labelClass}">Want to help?</p>
      <p class="${copyClass}">Join the <a class="${anchorClass}" href="https://github.com/ipfs/community/" target="_blank">IPFS Community</a>!</p>

      <p class="${labelClass}">New to IPFS?</p>
      <p class="${copyClass}">Read the <a class="${anchorClass}" href="http://docs.ipfs.io/" target="_blank">documentation</a> to learn about the basic <a class="${anchorClass}" href="http://docs.ipfs.io/guides/concepts" target="_blank">concepts</a> and working with IPFS.</p>

      <p class="${labelClass}">Got questions?</p>
      <p class="${copyClass} mv0">Visit the <a class="${anchorClass}" href="https://discuss.ipfs.io/" target="_blank">Discussion and Support Forum</a>.</p>
    </div>
  `
}

const renderVideos = () => {
  const anchorClass = 'relative overflow-hidden br2 o-90 glow'
  const videoWidth = 240
  const videoHeight = 180

  const overlayDiv = () => html`
    <div class="absolute absolute--fill bg-navy o-90"></div>
  `

  const playSvg = () => html`
    <svg class="aspect-ratio--object" x="0px" y="0px" viewBox="-90 -60 ${videoWidth} ${videoHeight}">
      <g fill="${colorIpfsLogo}">
        <path d="M30,0C13.4,0,0,13.4,0,30s13.4,30,30,30s30-13.4,30-30S46.6,0,30,0z M30,58C14.5,58,2,45.5,2,30C2,14.5,14.5,2,30,2 c15.5,0,28,12.5,28,28C58,45.5,45.5,58,30,58z" />
      </g>
      <g fill="${colorWhite}">
        <polygon points="43,30 23,40 23,20" />
      </g>
    </svg>
  `

  return html`
    <div class="w-80 flex justify-between-ns aqua f5">
      <div class="flex flex-column">
        <p>IPFS Alpha Demo</p>
        <a class="${anchorClass}" style="height: ${videoHeight}px" href="https://www.youtube.com/watch?feature=player_embedded&v=8CMxDNuuAiQ" target="_blank">
          <img width="${videoWidth}" height="${videoHeight}" src="https://img.youtube.com/vi/8CMxDNuuAiQ/0.jpg" alt="IPFS Alpha Demo" />
          ${overlayDiv()}
          ${playSvg()}
        </a>
      </div>

      <div class="flex flex-column">
        <p>IPFS and the Permanent Web</p>
        <a class="${anchorClass}" style="height: ${videoHeight}px" href="https://www.youtube.com/watch?feature=player_embedded&v=HUVmypx9HGI" target="_blank">
          <img width="${videoWidth}" height="${videoHeight}" src="https://img.youtube.com/vi/HUVmypx9HGI/0.jpg" alt="IPFS and the Permanent Web" />
          ${overlayDiv()}
          ${playSvg()}
        </a>
      </div>
    </div>
  `
}

const renderProjects = () => {
  const anchorClass = 'flex flex-column items-center navy link hover-aqua'
  const logoWidth = 80

  return html`
    <div class="w-80 navy f6">
      <p class="mb4 aqua f5">Related Projects</p>

      <div class="flex justify-between-ns">
        <a class="${anchorClass}" href="https://libp2p.io/" target="_blank">
          <img width="${logoWidth}" src="${libp2pLogo}" alt="libp2p Logo">
          <p>libp2p.io</p>
        </a>

        <a class="${anchorClass}" href="https://multiformats.io/" target="_blank">
          <img width="${logoWidth}" src="${multiformatsLogo}" alt="Multiformats Logo">
          <p>multiformats.io</p>
        </a>

        <a class="${anchorClass}" href="https://ipld.io/" target="_blank">
          <img width="${logoWidth}" src="${ipldLogo}" alt="IPLD Logo">
          <p>ipld.io</p>
        </a>
      </div>
    </div>
  `
}

module.exports = createWelcomePage
