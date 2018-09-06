'use strict'

const html = require('choo/html')

// Assets
const ipfsLogo = '../../../icons/ipfs-logo-on.svg'
const libp2pLogo = '../../../images/libp2p.svg'
const multiformatsLogo = '../../../images/multiformats.svg'
const ipldLogo = '../../../images/ipld.svg'

// Constants
const ipfsLogoWidth = 128

function createWelcomePage (i18n) {
  return function welcomePage (state, emit) {
    return html`
      <div class="flex flex-column flex-row-l">

        <div id="hero" class="w-100 min-vh-100 flex flex-column justify-center items-center bg-navy white">
          <img width="${ipfsLogoWidth}" src="${ipfsLogo}" alt="IPFS Logo">
          <p class="b f1">IPFS Companion</p>
          <p class="f5">You are ready to dive into distributed apps and sites built with IPFS!</p>
          <a class="white" href="https://ipfs.io/" target="_blank">Learn More</a>
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
    <div class="absolute absolute--fill bg-navy o-80"></div>
  `

  const playSvg = () => html`
    <svg class="aspect-ratio--object" x="0px" y="0px" viewBox="-90 -60 ${videoWidth} ${videoHeight}">
      <g fill="yellow">
        <path d="M30,0C13.4,0,0,13.4,0,30s13.4,30,30,30s30-13.4,30-30S46.6,0,30,0z M30,58C14.5,58,2,45.5,2,30C2,14.5,14.5,2,30,2 c15.5,0,28,12.5,28,28C58,45.5,45.5,58,30,58z" />
      </g>
      <g fill="white">
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
