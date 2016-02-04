'use strict'

require('./gui.js')

const protocols = require('./protocols.js')
const parent = require('sdk/remote/parent')

exports.main = function (options, callbacks) { // eslint-disable-line no-unused-vars
  require('./redirects.js')
  require('./peer-watch.js')
  protocols.register()
  parent.remoteRequire('./child-main.js', module)
// console.log('Addon loaded.')
}

exports.onUnload = function (reason) { // eslint-disable-line no-unused-vars
  protocols.unregister()
// console.log('Addon unloaded: ' + reason)
}
