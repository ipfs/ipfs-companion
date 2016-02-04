'use strict'

require('../lib/peer-watch.js')

const { setTimeout } = require('sdk/timers')
const { prefs } = require('sdk/simple-prefs')
const tabs = require('sdk/tabs')
const gw = require('../lib/gateways.js')

const ipfsPath = 'ipfs/QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/'

exports['test automatic mode disabling redirect when IPFS API is offline'] = function (assert, done) {
  const origApiPort = prefs.customApiPort
  const origApiPollInterval = prefs.apiPollInterval
  prefs.apiPollInterval = 100 // faster test
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
        prefs.customApiPort = origApiPort
        prefs.apiPollInterval = origApiPollInterval
        tab.close(done)
      }
    })
  }, prefs.apiPollInterval + 500)
}

require('sdk/test').run(exports)
