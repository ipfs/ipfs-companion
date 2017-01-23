'use strict'

require('./gui.js')

const protocols = require('./protocols.js')
const {setSyncLegacyDataPort} = require('./webext-migration.js')
const parent = require('sdk/remote/parent')
const webext = require('sdk/webextension')

// WebExtension migration
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Embedded_WebExtensions
webext.startup().then(({browser}) => {
  browser.runtime.onConnect.addListener(port => {
    if (port.name === 'sync-legacy-addon-data') {
      setSyncLegacyDataPort(port)
    }
  })
// console.log('---> WebExtension loaded')
})

exports.main = function (options, callbacks) { // eslint-disable-line no-unused-vars
  require('./redirects.js')
  require('./peer-watch.js')
  protocols.register()
  parent.remoteRequire('./child-main.js', module)
}

exports.onUnload = function (reason) { // eslint-disable-line no-unused-vars
  protocols.unregister()
// console.log('Addon unloaded: ' + reason)
}
