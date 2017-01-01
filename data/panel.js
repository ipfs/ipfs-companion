'use strict'

/* global self */

function getById (id) {
  return document.getElementById(id)
}

function renderGatewayAddress (prefs) {
  return prefs.customGatewayHost + ':' + prefs.customGatewayPort
}

function showIf (id, condition) {
  getById(id).style.display = condition ? 'block' : 'none'
}

function setIconState (enable) {
  getById('icon').src = enable ? 'ipfs-logo-on.svg' : 'ipfs-logo-off.svg'
}

// incoming
self.port.on('show', function (context) {
  // console.log('show event received by panel.js (ipfsResource='+ipfsResource+')')
  const {prefs, apiIsUp, isIPFS} = context

  // render diagnostic info
  getById('gateway-address-val').textContent = renderGatewayAddress(prefs)
  setIconState(prefs.useCustomGateway)

  // if current page is pinnable
  showIf('ipfs-resource-actions', isIPFS)

  // if custom gateway is used
  showIf('redirect-enabled', prefs.useCustomGateway)
  showIf('redirect-disabled', !prefs.useCustomGateway)
  showIf('enable-gateway-redirect', !prefs.useCustomGateway)
  showIf('disable-gateway-redirect', prefs.useCustomGateway)
  showIf('toggle-gateway-redirect', (apiIsUp && !prefs.useCustomGateway) || prefs.useCustomGateway)
  showIf('open-webui', apiIsUp)
  showIf('pin-current-ipfs-address', isIPFS && apiIsUp)

  // resize panel to match size of rendered items
  self.port.emit('resize', { 'width': document.body.scrollWidth, 'height': document.body.scrollHeight })
})

self.port.on('version', function (update) {
  getById('gateway-version-val').textContent = update
    ? update.Version + (update.Commit ? ('-' + update.Commit) : '')
    : 'n/a'
})

self.port.on('swarm-peers', function (peers) {
  var peerCount = null
  if (peers && peers.Strings) { // go-ipfs <= 0.4.4
    peerCount = peers.Strings.length
  } else if (peers && peers.Peers) { // go-ipfs >= 0.4.5
    peerCount = peers.Peers.length
  } else {
    peerCount = 'n/a'
  }
  getById('swarm-peers-val').textContent = peerCount
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
