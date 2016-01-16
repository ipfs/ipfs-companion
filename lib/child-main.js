'use strict'

const protocols = require('./protocols.js')

protocols.register()
require('./rewrite-pages.js')

require('sdk/system/unload').when(() => {
  protocols.unregister()
})
