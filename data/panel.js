/* global self */
let getById = (id) => {
  return document.getElementById(id)
}

let renderGatewayAddress = (prefs) => {
  if (prefs.useCustomGateway) {
    return prefs.customGatewayHost + ':' + prefs.customGatewayPort
  } else {
    return 'OFF'
  }
}

function showIf(id, condition) {
  getById(id).style.display = condition ? 'block' : 'none'
}

// incoming
self.port.on('show', function (context) {
  // console.log('show event received by panel.js (ipfsResource='+ipfsResource+')')
  let prefs = context.preferences

  // render diagnostic info
  getById('gateway-address-val').innerHTML = renderGatewayAddress(prefs)

  // if current page is pinnable
  showIf('ipfs-resource-actions', context.isPinnable)

  // if custom gateway is used
  showIf('open-webui', prefs.useCustomGateway)
  showIf('gateway-version', prefs.useCustomGateway)
  showIf('swarm-peers', prefs.useCustomGateway)
  showIf('pin-current-ipfs-address', prefs.useCustomGateway)

  // resize panel to match size of rendered items
  self.port.emit('resize', { 'width': document.body.scrollWidth, 'height': document.body.scrollHeight })
})

self.port.on('version', function (update) {
  getById('gateway-version-val').innerHTML = update
    ? update.Version + '-' + update.Commit
    : 'n/a'
})

self.port.on('swarm-peers', function (update) {
  getById('swarm-peers-val').innerHTML = (update && update.Strings)
    ? update.Strings.length
    : 'n/a'
})

// outgoing
function forwardClickEvent (eventName) {
  getById(eventName)
    .addEventListener('click', function (event) { // eslint-disable-line no-unused-vars
      self.port.emit(eventName)
    })
}

forwardClickEvent('toggle-gateway-redirect')
forwardClickEvent('open-webui')
forwardClickEvent('open-preferences')

forwardClickEvent('pin-current-ipfs-address')
forwardClickEvent('copy-current-ipfs-address')
forwardClickEvent('copy-current-public-gw-url')
