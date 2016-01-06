// incoming
self.port.on('show', function(ipfsResource) {
  //console.log('show event received by panel.js (ipfsResource='+ipfsResource+')');

  // show/hide ipfs-only items
  document.getElementById('ipfs-only')
    .style.display = ipfsResource ? 'block' : 'none';
});

// outgoing
function forwardClickEvent(eventName) {
  document.getElementById(eventName)
    .addEventListener('click', function(event) { // eslint-disable-line no-unused-vars
      self.port.emit(eventName);
    });
}

// always visible
forwardClickEvent('toggle-gateway-redirect');
forwardClickEvent('open-webui');

// ipfs-only
forwardClickEvent('pin-current-ipfs-address');
forwardClickEvent('copy-current-ipfs-address');
forwardClickEvent('copy-current-public-gw-url');
