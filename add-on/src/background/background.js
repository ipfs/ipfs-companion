'use strict'
/* eslint-env browser, webextensions */

const createIpfsCompanion = require('../lib/ipfs-companion')

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', async () => {
  window.ipfsCompanion = await createIpfsCompanion()
})

var portFromCS;

function connected(p) {
  portFromCS = p;
  portFromCS.onMessage.addListener(function(m) {
    if (m.from === 'content-script') {
      console.log('received background-page <- content-script', m)
      if (m.func === 'id') {
        window.ipfsCompanion.ipfs.id((err, res) => {
          console.log('sending background-page -> content-script')
          portFromCS.postMessage({func: 'id', err, res, from: 'background-page'})
        })
      }
    }
  });
}

browser.runtime.onConnect.addListener(connected);
// 
// browser.browserAction.onClicked.addListener(function() {
//   portFromCS.postMessage({greeting: "they clicked the button!"});
// });

