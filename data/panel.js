/* global self */

// incoming
self.port.on('show', function (context) {
  // console.log('show event received by panel.js (ipfsResource='+ipfsResource+')')
  let isPinnable = context['isPinnable']

  // show/hide ipfs-only items
  document.getElementById('ipfs-only')
    .style.display = isPinnable ? 'block' : 'none'

  // match panel size
  self.port.emit('resize', { 'width': document.body.scrollWidth, 'height': document.body.scrollHeight })
})

// outgoing
function forwardClickEvent (eventName) {
  document.getElementById(eventName)
    .addEventListener('click', function (event) { // eslint-disable-line no-unused-vars
      self.port.emit(eventName)
    })
}

// always visible
forwardClickEvent('toggle-gateway-redirect')
forwardClickEvent('open-webui')
forwardClickEvent('open-preferences')

// ipfs-only
forwardClickEvent('pin-current-ipfs-address')
forwardClickEvent('copy-current-ipfs-address')
forwardClickEvent('copy-current-public-gw-url')
