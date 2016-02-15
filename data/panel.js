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
  getById('icon').src = enable ? 'icon-on-64.png' : 'icon-off-64.png'
}

// incoming
self.port.on('show', function (context) {
  // console.log('show event received by panel.js (ipfsResource='+ipfsResource+')')
  let prefs = context.preferences

  // render diagnostic info
  getById('gateway-address-val').textContent = renderGatewayAddress(prefs)
  setIconState(prefs.useCustomGateway)

  // if current page is pinnable
  showIf('ipfs-resource-actions', context.isPinnable)

  // if custom gateway is used
  showIf('redirect-enabled', prefs.useCustomGateway)
  showIf('redirect-disabled', !prefs.useCustomGateway)
  showIf('enable-gateway-redirect', !prefs.useCustomGateway)
  showIf('disable-gateway-redirect', prefs.useCustomGateway)
  showIf('open-webui', prefs.useCustomGateway)
  showIf('open-webui', prefs.useCustomGateway)
  // showIf('gateway-version', prefs.useCustomGateway)
  // showIf('swarm-peers', prefs.useCustomGateway)
  showIf('pin-current-ipfs-address', prefs.useCustomGateway)

  // resize panel to match size of rendered items
  self.port.emit('resize', { 'width': document.body.scrollWidth, 'height': document.body.scrollHeight })
})

self.port.on('version', function (update) {
  getById('gateway-version-val').textContent = update
    ? update.Version + '-' + update.Commit
    : 'n/a'
})

self.port.on('swarm-peers', function (update) {
  getById('swarm-peers-val').textContent = (update && update.Strings)
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
