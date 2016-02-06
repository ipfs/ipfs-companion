'use strict'

const { before, after } = require('sdk/test/utils')
const { prefs } = require('sdk/simple-prefs')

exports.storePrefs = (backup) => {
  // console.log('Backing up simple-prefs')
  if (!backup) {
    backup = new Map()
  }
  for (let key in prefs) {
    backup.set(key, prefs[key])
  }
  return backup
}

exports.restorePrefs = (backup) => {
  // console.log('Restoring simple-prefs')
  for (let [key, data] of backup) {
    prefs[key] = data
  }
}

exports.isolateTestCases = (testCases) => {
  let backup = null
  before(testCases, (name, assert) => {
    backup = exports.storePrefs()
  })
  after(testCases, (name, assert) => {
    exports.restorePrefs(backup)
  })
}
