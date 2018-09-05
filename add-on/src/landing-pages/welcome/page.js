'use strict'

const html = require('choo/html')

// Assets
const ipfsLogo = '../../../icons/ipfs-logo-on.svg'
const libp2pLogo = '../../../images/libp2p.svg'
const multiformatsLogo = '../../../images/multiformats.svg'
const ipldLogo = '../../../images/ipld.svg'
const videoThumbnail = '../../../images/video.png'

// Constants
const ipfsLogoWidth = 128
const projectLogoWidth = 80

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

const renderResources = () => html`
  <div class="w-80 navy f5">
    <p class="aqua mb1">Want to help?</p>
    <p class="mt0 mb4 lh-copy">Join the <a class="navy link underline-under hover-aqua" href="https://github.com/ipfs/community/" target="_blank">IPFS Community</a>!</p>

    <p class="aqua mb1">New to IPFS?</p>
    <p class="mt0 mb4 lh-copy">Read the <a class="navy link underline-under hover-aqua" href="http://docs.ipfs.io/" target="_blank">documentation</a> to learn about the basic <a class="navy link underline-under hover-aqua" href="http://docs.ipfs.io/guides/concepts" target="_blank">concepts</a> and working with IPFS.</p>

    <p class="aqua mb1">Got questions?</p>
    <p class="mv0 lh-copy">Visit the <a class="navy link underline-under hover-aqua" href="https://discuss.ipfs.io/" target="_blank">Discussion and Support Forum</a>.</p>
  </div>
`
const renderVideos = () => html`
  <div class="w-80 flex justify-between-ns aqua f5">
    <div class="flex flex-column">
      <p>IPFS Alpha Demo</p>
      <img width="200" src="${videoThumbnail}" alt="libp2p Logo">
    </div>

    <div class="flex flex-column">
      <p>IPFS and the Permanent Web</p>
      <img width="200" src="${videoThumbnail}" alt="libp2p Logo">
    </div>
  </div>
`

const renderProjects = () => html`
  <div class="w-80 navy f6">
    <p class="mb4 aqua f5">Related Projects</p>

    <div class="flex justify-between-ns">
      <a class="flex flex-column items-center navy link hover-aqua" href="https://libp2p.io/" target="_blank">
        <img width="${projectLogoWidth}" src="${libp2pLogo}" alt="libp2p Logo">
        <p>libp2p.io</p>
      </a>

      <a class="flex flex-column items-center navy link hover-aqua" href="https://multiformats.io/" target="_blank">
        <img width="${projectLogoWidth}" src="${multiformatsLogo}" alt="Multiformats Logo">
        <p>multiformats.io</p>
      </a>

      <a class="flex flex-column items-center navy link hover-aqua" href="https://ipld.io/" target="_blank">
        <img width="${projectLogoWidth}" src="${ipldLogo}" alt="IPLD Logo">
        <p>ipld.io</p>
      </a>
    </div>
  </div>
`

module.exports = createWelcomePage
