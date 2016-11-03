'use strict'

const { prefs } = require('sdk/simple-prefs')

const { notify } = require('sdk/notifications')
const { Request } = require('sdk/request')
const { URL } = require('sdk/url')

const pw = require('./peer-watch.js')
const dnsCache = require('./dns-cache.js')

Object.defineProperty(exports, 'isUp', {
  get: function () {
    return pw.peerCount != null
  }
})

function apiUrl (path) {
  return URL('http://' + prefs.customGatewayHost + ':' + prefs.customApiPort + '/api/v0/' + path).toString()
}

function pin (address) {
  address = address.split('#')[0] // ignore URL hash
  address = address.split('?')[0] // ignore GET params

  new Request({
    url: apiUrl('pin/add?arg=' + address),
    onComplete: function (response) {
      let pinned = response.status === 200
      notify({
        title: pinned ? 'Pinned' : 'Failed to pin',
        text: address
      })
    }
  }).get()
}

function query (path, callback) {
  new Request({
    url: apiUrl(path),
    onComplete: function (response) {
      let data = null
      if (response.status === 200) {
        data = response.json
      }
      callback(data)
    }
  }).get()
}

function getVersion (callback) {
  query('version', callback)
}

function getSwarmPeers (callback) {
  query('swarm/peers?stream-channels=true', callback)
}

// Asynchronously fetch missing dnslink status for a domain
// and put it in the cache. For more info see
// https://github.com/lidel/ipfs-firefox-addon/issues/69
function prefetchDnslink (fqdn, callback) {
  if (exports.isUp && !dnsCache.has(fqdn)) {
    query('dns/' + fqdn, (result) => {
      dnsCache.put(fqdn, (result ? !!result.Path : false))
      if (callback) { callback() }
    })
  } else if (callback) {
    callback()
  }
}

function getCachedDnslinkLookupResult (fqdn) {
  return !!dnsCache.get(fqdn)
}

exports.apiUrl = apiUrl
exports.query = query
exports.pin = pin
exports.getVersion = getVersion
exports.getSwarmPeers = getSwarmPeers
exports.isDnslinkPresent = getCachedDnslinkLookupResult
exports.prefetchDnslink = prefetchDnslink
