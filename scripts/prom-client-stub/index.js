'use strict'

// This is a basic stub to build node-like js-ipfs
// for use in Brave, but without prometheus libs which are not compatible
// with browser context
function Gauge () {}
module.exports = {
  Gauge,
  register: {
    clear () { }
  }
}
