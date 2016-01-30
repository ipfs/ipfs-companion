'use strict'

const { setTimeout } = require('sdk/timers')
const { prefs } = require('sdk/simple-prefs')
const tabs = require('sdk/tabs')
const gw = require('../lib/gateways.js')
const autoMode = require('../lib/automatic-mode.js')

const ipfsPath = 'ipfs/QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/'

exports['test automatic mode disabling redirect when IPFS API is offline'] = function (assert, done) {
  let apiPort = prefs.customApiPort
  prefs.customApiPort = 59999 // change to something that will always fail
  prefs.useCustomGateway = true
  prefs.automatic = true

  setTimeout(function () {
    assert.equal(prefs.automatic, true, 'automatic mode should be enabled')
    assert.equal(prefs.useCustomGateway, false, 'redirect should be automatically disabled')
    assert.equal(gw.redirectEnabled, false, 'redirect should be automatically disabled')
    tabs.open({
      url: 'http://ipfs.io/' + ipfsPath,
      onReady: function onReady (tab) {
        assert.equal(tab.url, 'http://ipfs.io/' + ipfsPath, 'expected no redirect')
        prefs.automatic = false
        prefs.customApiPort = apiPort
        tab.close(done)
      }
    })
  }, autoMode.interval + 100)
}

require('sdk/test').run(exports)
