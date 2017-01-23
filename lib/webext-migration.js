const sp = require('sdk/simple-prefs')

exports.setSyncLegacyDataPort = function (port) {
  // Send the initial data dump.
  port.postMessage({
    prefs: {
      useCustomGateway: sp.prefs['useCustomGateway'],
      automatic: sp.prefs['automatic'],
      publicGatewayHosts: sp.prefs['publicGatewayHosts'],
      customGatewayHost: sp.prefs['customGatewayHost'],
      customGatewayPort: sp.prefs['customGatewayPort'],
      customApiPort: sp.prefs['customApiPort'],
      apiPollInterval: sp.prefs['apiPollInterval'],
      dns: sp.prefs['dns'],
      linkify: sp.prefs['linkify'],
      fsUris: sp.prefs['fsUris']
    }
  })

  // Keep the preferences in sync with the data stored in the webextension.
  sp.on('', () => {
    port.postMessage({
      prefs: {
        useCustomGateway: sp.prefs['useCustomGateway'],
        automatic: sp.prefs['automatic'],
        publicGatewayHosts: sp.prefs['publicGatewayHosts'],
        customGatewayHost: sp.prefs['customGatewayHost'],
        customGatewayPort: sp.prefs['customGatewayPort'],
        customApiPort: sp.prefs['customApiPort'],
        apiPollInterval: sp.prefs['apiPollInterval'],
        dns: sp.prefs['dns'],
        linkify: sp.prefs['linkify'],
        fsUris: sp.prefs['fsUris']
      }
    })
  })
}
