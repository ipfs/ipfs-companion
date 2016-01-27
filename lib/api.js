'use strict'

const prefs = require('sdk/simple-prefs').prefs

const notifications = require('sdk/notifications')
const Request = require('sdk/request').Request
const URL = require('sdk/url').URL

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
      notifications.notify({
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

exports.query = query
exports.pin = pin
exports.getVersion = getVersion
exports.getSwarmPeers = getSwarmPeers
