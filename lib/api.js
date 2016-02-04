'use strict'

const { prefs } = require('sdk/simple-prefs')

const { notify } = require('sdk/notifications')
const { Request } = require('sdk/request')
const { XMLHttpRequest } = require('sdk/net/xhr')
const { URL } = require('sdk/url')

const dnsCache = require('./dns-cache.js')

function apiUrl (path) {
  return URL('http://' + prefs.customGatewayHost + ':' + prefs.customApiPort + '/api/v0/' + path).toString()
}

function pin (address) {
  address = address.split('#')[0] // ignore URL hash
  address = address.split('?')[0] // ignore GET params

  new Request({
    url: apiUrl('pin/add?arg=' + address),
    onComplete: function (response) {
      let pinned = response.status === 200 && response.json.Pinned ? response.json.Pinned[0] : false
      notify({
        title: pinned ? 'Pinned' : 'Failed to pin',
        text: pinned || address.slice(6)
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

function isDnslinkPresent (fqdn) {
  let xhr = new XMLHttpRequest()
  xhr.overrideMimeType('application/json')
  xhr.open('GET', apiUrl('dns/' + fqdn), false)
  try {
    xhr.send(null)
  } catch (e) {
    return null
  }
  if (xhr.status === 200) {
    let json = JSON.parse(xhr.responseText)
    return !!json.Path
  } else {
    return false
  }
}

function isDnslinkPresentCached (fqdn) {
  let ipfsSupport = dnsCache.get(fqdn)
  if (typeof ipfsSupport === 'undefined') {
    ipfsSupport = isDnslinkPresent(fqdn)
    if (ipfsSupport !== null) { // dont cache is API was down
      dnsCache.put(fqdn, ipfsSupport)
    }
  }
  return !!ipfsSupport
}

exports.apiUrl = apiUrl
exports.query = query
exports.pin = pin
exports.getVersion = getVersion
exports.getSwarmPeers = getSwarmPeers
exports.isDnslinkPresent = isDnslinkPresentCached
