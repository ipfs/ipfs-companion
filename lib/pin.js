'use strict'

const {Cc, Ci} = require('chrome')

const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)
const prefs = require('sdk/simple-prefs').prefs

const notifications = require('sdk/notifications')
const Request = require('sdk/request').Request

function pin (address) {
  address = address.split('#')[0] // ignore URL hash
  address = address.split('?')[0] // ignore GET params
  let IPFS_API_URI = 'http://' + prefs.customGatewayHost + ':' + prefs.customApiPort + '/api/v0'
  let uri = ioservice.newURI(IPFS_API_URI + '/pin/add?arg=' + address, null, null)

  new Request({
    url: uri.spec,
    onComplete: function (response) {
      let pinned = response.status === 200 && response.json.Pinned ? response.json.Pinned[0] : false
      notifications.notify({
        title: pinned ? 'Pinned' : 'Failed to pin',
        text: pinned || address.slice(6)
      })
    }
  }).get()
}

exports.pin = pin
