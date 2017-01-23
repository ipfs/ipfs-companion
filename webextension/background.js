'use strict'
/* eslint-env browser, webextensions */

// Ask to the legacy part to dump the needed data and send it back
// to the background page...
var port = browser.runtime.connect({name: 'sync-legacy-addon-data'})
port.onMessage.addListener((msg) => {
  if (msg) {
    // Where it can be saved using the WebExtensions storage API.
    var gwhost = msg.prefs['customGatewayHost']
    for (var key in msg.prefs) {
      var value = msg.prefs[key]
      var option = {}
      // console.log(key + ' = ' + value)
      if (key === 'useCustomGateway') {
        option['useCustomGateway'] = !!value
      } else if (key === 'automatic') {
        option['automaticMode'] = !!value
      } else if (key === 'publicGatewayHosts') {
        option['publicGateways'] = value
      } else if (key === 'customGatewayPort') {
        option['customGatewayUrl'] = new URL('http://' + gwhost + ':' + value).toString()
      } else if (key === 'customApiPort') {
        option['ipfsApiUrl'] = new URL('http://' + gwhost + ':' + value).toString()
      } else if (key === 'apiPollInterval') {
        option['ipfsApiPollMs'] = value
      } else if (key === 'dns') {
        option['dnslink'] = !!value
      } else if (key === 'linkify') {
        option['linkify'] = !!value
      } else if (key === 'fsUris') {
        option['defaultToFsProtocol'] = !!value
      }
      if (Object.keys(option).length) {
        // console.log(`saving ${JSON.stringify(option)}`)
        browser.storage.local.set(option)
      }
    }
  }
})
