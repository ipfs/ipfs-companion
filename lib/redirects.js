'use strict';

const gw = require('./gateways');

var { Cc, Ci, Cr } = require('chrome');

const protocols = require("./protocols.js")

var ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var events = require("sdk/system/events");

const listener = function(event) {
  //console.log("obs", event);
  let {subject, type, data} = event;

  if (type == 'http-on-modify-request') {
    if(!gw.isEnabled() && prefs.rewriteAs == "gateway")
      return;
    let channel = subject.QueryInterface(Ci.nsIHttpChannel);
    let httpUrl = channel.URI.spec;
    let isGatewayRequest = !!(httpUrl.match(gw.publicHosts()) && httpUrl.match(gw.IPFS_RESOURCE));
    // TODO: handle gateway -> local redirects
    if(!isGatewayRequest)
      return;
    let ipfsURI = ioservice.newURI(protocols.fsScheme + ":" + channel.URI.path, null, null);
    channel.setRequestHeader('x-ipfs-firefox-addon', 'true', false);

    //console.log("comp", ipfsURI.spec, channel.originalURI.spec, ipfsURI.spec == channel.originalURI.spec)

    if(prefs.useCustomGateway || !channel.originalURI || channel.originalURI.spec != ipfsURI.spec ) {
      /*
        complex dance to replace channel and thus top level document URLs. works but complex.
        TODO:  investigate if manipulating channel.originalURI + channel.documentURI + LOAD_REPLACE
      */

      //console.log("redirecting")
      //channel.redirectTo(ipfsURI);
      let newChan = ioservice.newChannelFromURI(ipfsURI);

      newChan.loadInfo = channel.loadInfo

      newChan.loadGroup = channel.loadGroup
      newChan.notificationCallbacks = channel.notificationCallbacks;

      var loadCtx = newChan.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsILoadContext);

      let loadGroup = channel.loadGroup;
      newChan.loadGroup = loadGroup;
      //loadGroup.addRequest(newChan, loadCtx)

      channel.loadGroup = null;


      newChan.loadFlags |= channel.loadFlags //| Ci.nsIChannel.LOAD_REPLACE;

      if (channel instanceof Ci.nsIHttpChannelInternal && newChan instanceof Ci.nsIHttpChannelInternal) {
        newChan.documentURI = newChan.originalURI
      }

      var eventSink = channel.notificationCallbacks.getInterface(Ci.nsIChannelEventSink);
      eventSink.asyncOnChannelRedirect(channel,newChan,Ci.nsIChannelEventSink.REDIRECT_INTERNAL,function() {});

      let replacementListener = {
        onDataAvailable: function() {},
        onStopRequest: function() {},
        onStartRequest: function() {}
      }

      channel.QueryInterface(Ci.nsITraceableChannel);
      let oldListener = channel.setNewListener(replacementListener);
      channel.notificationCallbacks = null;

      newChan.asyncOpen(oldListener,loadCtx)
      channel.cancel(Cr.NS_BINDING_REDIRECTED);
      loadGroup.removeRequest(channel, loadCtx, Cr.NS_BINDING_REDIRECTED)



    }
  }
};


events.on('http-on-modify-request', listener);


exports.on = () => {};
exports.off = () => {};


exports.ipfsRequestObserver = listener;
