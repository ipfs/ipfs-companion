'use strict'

const prefs = require('sdk/simple-prefs').prefs
const gw = require('./gateways.js')
const api = require('./api.js')
const dnsCache = require('./dns-cache.js')
const isIPFS = require('./npm/is-ipfs.js')

const {Cc, Ci} = require('chrome')

const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)
const observice = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService)

function redirectFor (uri) {
  let redirectUri = null
  if (gw.redirectEnabled) {
    let uriSpec = uri.spec
    if (uriSpec.match(gw.publicHosts) && isIPFS.url(uriSpec)) {
      // redirect IPFS paths from known public gateways
      redirectUri = ioservice.newURI(uriSpec.replace(gw.publicHosts, gw.customUri.spec), null, null)
    } else if (prefs.dns && api.isDnslinkPresent(uri.host)) {
      if (isIPFS.url(uriSpec)) {
        // when a site runs a public gateway in addition to dnslink
        // redirect IPFS paths to /ipfs/ at the gateway - https://git.io/vg4mm
        redirectUri = ioservice.newURI(gw.customUri.spec + uri.path, null, null)
      } else {
        // redirect sites with dnslink record in DNS to /ipns/<fqdn>
        redirectUri = ioservice.newURI(gw.customUri.spec + 'ipns/' + uri.host + uri.path, null, null)
      }
    }
  }
  // if (redirectUri) console.log('redirectFor(' + uri.spec + ')=' + redirectUri.spec)
  return redirectUri
}

const ipfsRequestObserver = {
  process: function (channel) {
    const redirect = redirectFor(channel.URI)
    if (redirect) {
      channel.redirectTo(redirect)
    }
  },
  observe: function (subject, topic, data) { // eslint-disable-line no-unused-vars
    if (topic === 'http-on-modify-request') {
      const channel = subject.QueryInterface(Ci.nsIHttpChannel)
      const fqdn = channel.URI.host
      if (prefs.dns && !dnsCache.has(fqdn) && api.isUp) {
        const request = subject.QueryInterface(Ci.nsIRequest)
        // console.log('suspend request for dnslokup: ' + fqdn)
        request.suspend()
        api.prefetchDnslink(fqdn, () => {
          // console.log('resume request after dnslokup: ' + fqdn)
          request.resume()
          this.process(channel)
        })
      } else {
        // console.log('no interruption for: ' + fqdn)
        this.process(channel)
      }
    }
  },
  register: function () {
    if (this.registered) {
      return
    }
    this.registered = true
    observice.addObserver(this, 'http-on-modify-request', false)
  },
  unregister: function () {
    if (!this.registered) {
      return
    }
    this.registered = false
    observice.removeObserver(this, 'http-on-modify-request')
  }
}

gw.onPreferencesChange(() => {
  if (gw.redirectEnabled) {
    ipfsRequestObserver.register()
  } else {
    ipfsRequestObserver.unregister()
  }
})

exports.on = ipfsRequestObserver.register
exports.off = ipfsRequestObserver.unregister

exports.ipfsRequestObserver = ipfsRequestObserver
