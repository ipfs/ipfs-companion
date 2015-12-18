'use strict';

const gw = require('./gateways');

var {
  Cc, Ci
} = require('chrome');

var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);

var ipfsRequestObserver = {
  observe: function(subject, topic, data) { // jshint unused:false
    if (topic == 'http-on-modify-request') {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);
      let httpUrl = channel.URI.spec;
      if (httpUrl.match(gw.publicHosts()) && httpUrl.match(gw.IPFS_RESOURCE)) {
        channel.setRequestHeader('x-ipfs-firefox-addon', 'true', false);
        if (gw.isEnabled()) {
          //console.info('Detected HTTP request to the public gateway: ' + channel.URI.spec);
          let uri = ioservice.newURI(httpUrl.replace(gw.publicHosts(), gw.customUri().spec), null, null);
          //console.info('Redirecting to custom gateway: ' + uri.spec);
          channel.redirectTo(uri);
        }
      }
    }
  },
  get observerService() {
    return Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
  },
  register: function() {
    if (this.registered)
      return;
    this.registered = true;
    this.observerService.addObserver(this, 'http-on-modify-request', false);
  },

  unregister: function() {
    if (!this.registered)
      return;
    this.registered = false;
    this.observerService.removeObserver(this, 'http-on-modify-request');
  }
};

gw.onChange(() => {
  if (gw.isEnabled()) {
    ipfsRequestObserver.register();
  } else {
    ipfsRequestObserver.unregister();
  }
});
gw.reload(); // enable redirect


exports.on = ipfsRequestObserver.register;
exports.off = ipfsRequestObserver.unregister;


exports.ipfsRequestObserver = ipfsRequestObserver;
