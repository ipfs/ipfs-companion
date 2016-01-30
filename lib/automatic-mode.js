const { setInterval, clearInterval } = require('sdk/timers')
const notifications = require('sdk/notifications')
const prefs = require('sdk/simple-prefs').prefs
const api = require('./api.js')
const gw = require('./gateways.js')
const _ = require('sdk/l10n').get

const interval = 3000
let watch = null

function ipfsHealthCheck () {
  api.getSwarmPeers((peers) => {
    let isUp = peers && peers.Strings && peers.Strings.length > 0 || false
    if (isUp !== gw.redirectEnabled) {
      notifications.notify({
        title: isUp ? _('automatic_up_notification_title') : _('automatic_down_notification_title'),
        text: isUp ? _('automatic_up_notification_text') : _('automatic_down_notification_text')
      })
    }
    gw.redirectEnabled = isUp
  })
}

// execute on startup and then on every preference change
require('sdk/simple-prefs').on('automatic', (function f () {
  clearInterval(watch)
  if (prefs.automatic) {
    watch = setInterval(ipfsHealthCheck, interval)
  }
  return f
})())

exports.interval = interval
exports.triggerManualCheck = ipfsHealthCheck
