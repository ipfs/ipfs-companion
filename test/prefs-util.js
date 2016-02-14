'use strict'

const { before } = require('sdk/test/utils')
const { prefs } = require('sdk/simple-prefs')

const backup = new Map()

for (let key in prefs) {
  backup.set(key, prefs[key])
}

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
