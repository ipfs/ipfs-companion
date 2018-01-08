const html = require('choo/html')

module.exports = function missingIpfsPage (state, emit) {
  return html`
  <div id="main" class="vh-100 w-100 flex justify-center pl5 pt5 pr5 avenir">
    <div class="w-70 flex flex-column pt4 items-start white">
      <div class="flex">
        <img class="logo" src="../../icons/ipfs-logo-on.svg" alt="IPFS Logo">
        <h2 class="f2 pl3 fw2 light-gray">Almost there! ${state.message}</h2>
      </div>

      <div class="pa4">
        <p class="f2 fw5 lh-copy ma0 light-gray">
          Thank you for installing IPFS Companion!
        </p>
        <p class="f3 fw2 lh-copy light-gray">
          You still need to install the client application to connect to the IPFS network.
        </p>
        <a class="f3 link pl4 pt3 pr4 pb3 mb2 mt2 dib white shadow-2" id="btn-install" href="https://github.com/ipfs-shipyard/station">Install IPFS Station</a>
      </div>
    </div>
  </div>
  `
}
