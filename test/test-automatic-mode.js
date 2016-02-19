'use strict'

require('../lib/peer-watch.js')

const { env } = require('sdk/system/environment')
const { setTimeout } = require('sdk/timers')
const { prefs } = require('sdk/simple-prefs')
const tabs = require('sdk/tabs')
const gw = require('../lib/gateways.js')

exports['test automatic mode disabling redirect when IPFS API is offline'] = function (assert, done) {
  const ipfsPath = 'ipfs/QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/Makefile'
  const checkDelay = ('TRAVIS' in env && 'CI' in env) ? 10000 : 500
  prefs.apiPollInterval = 100 // faster test
  prefs.customApiPort = 59999 // change to something that will always fail
  prefs.useCustomGateway = true
  prefs.automatic = true

  setTimeout(function () {
    assert.equal(prefs.automatic, true, 'automatic mode should be enabled')
    assert.equal(prefs.useCustomGateway, false, 'redirect should be automatically disabled')
    assert.equal(gw.redirectEnabled, false, 'redirect should be automatically disabled')
    tabs.open({
      url: 'https://ipfs.io/' + ipfsPath,
      onReady: function onReady (tab) {
        assert.equal(tab.url, 'https://ipfs.io/' + ipfsPath, 'expected no redirect')
        tab.close(done)
      }
    })
  }, prefs.apiPollInterval + checkDelay)
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
