'use strict'

const html = require('choo/html')

const ipfsLogoPath = '../../../icons/ipfs-logo-on.svg'
const logoWidth = 128

function createWelcomePage (i18n) {
  return function welcomePage (state, emit) {
    return html`
    <div class="flex flex-column flex-row-l min-vh-100">
      <div id="hero" class="flex flex-column justify-center items-center w-100 min-vh-100 bg-navy white">
        <img width="${logoWidth}" src="${ipfsLogoPath}" alt="IPFS Logo">
        <p class="f3">IPFS Companion</p>
        <p class="f5">You are ready to dive into distributed apps and sites built with IPFS!</p>
        <a class="white" href="https://ipfs.io" target="_blank">Learn More</a>
      </div>

      <div class="flex flex-column justify-center items-center w-100 min-vh-100 charcoal">
        <div>
          <p>Dig into the Dweb:</p>
          <p><a class="navy" href="#">Video resource 1</a></p>
          <p><a class="navy" href="#">Video resource 2</a></p>

          <br><br>

          <p>Try this apps built on top of IPFS:</p>
          <p><a class="navy" href="#">IPFS Desktop</a></p>
          <p><a class="navy" href="#">PeerPad</a></p>
        </div>
      </div>
    </div>
    `
  }
}

module.exports = createWelcomePage
