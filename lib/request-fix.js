'use strict'

const {Ci} = require('chrome')
const events = require('sdk/system/events')
const gw = require('./gateways.js')

/*
const catman = Cc['@mozilla.org/categorymanager;1'].getService(CI.nsICategoryManager)
// category ("net-channel-event-sinks")
catman.addCategoryEntry(in string aCategory, in string aEntry, in string aValue, in boolean aPersist, in boolean aReplace)
*/

function fixupRequest (e) {
  if (e.type !== 'http-on-modify-request') {
    return
  }
  if (!gw.fsUris) {
    return
  }
  const channel = e.subject.QueryInterface(Ci.nsIHttpChannel)

  channel.QueryInterface(Ci.nsIHttpChannelInternal)
  channel.QueryInterface(Ci.nsIPropertyBag2)
  channel.QueryInterface(Ci.nsIPropertyBag)

  let isIpfsReq = null
  try {
    isIpfsReq = channel.hasKey('ipfs-uri')
  } catch (e) {
    // console.log(e)
  }

  if (isIpfsReq && channel.originalURI.scheme === 'fs') {
    /*
    // TODO: investigate effects of the following flags
    // cookies make no sense in the ipfs context, we don't want to carry different gateway cookies into the page
    channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS
    // should only do that for /ipfs/ paths since those are stable
    channel.loadFlags |= Ci.nsIRequest.VALIDATE_NEVER
    */

    // prevent redirects from replacing the effective URI
    channel.loadFlags &= ~Ci.nsIChannel.LOAD_REPLACE

  }

}

events.on('http-on-modify-request', fixupRequest)
