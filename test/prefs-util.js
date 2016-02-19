'use strict'

const { before } = require('sdk/test/utils')
const { prefs } = require('sdk/simple-prefs')

const backup = new Map()

for (let key in prefs) {
  backup.set(key, prefs[key])
}

// set fake ports so that local gw
// does not slow down test suite
backup.set('customApiPort', 55001)
backup.set('customGatewayPort', 58080)

function restorePrefs () {
  // console.log('Restoring simple-prefs')
  for (let [key, data] of backup) {
    prefs[key] = data
  }
}

exports.restorePrefs = restorePrefs

exports.isolateTestCases = (testCases) => {
  before(testCases, (name, assert) => {
    restorePrefs()
  })
}
