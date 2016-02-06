'use strict'

require('../lib/redirects.js')

const gw = require('../lib/gateways.js')
const api = require('../lib/api.js')
const tabs = require('sdk/tabs')
const { prefs } = require('sdk/simple-prefs')
const dnsCache = require('../lib/dns-cache.js')

exports['test a redirect triggered by dnslink'] = function (assert, done) {
  const fqdnWithDnslink = 'ipfs.git.sexy'
  const sitePath = '/some/path/to-resource#with-hash'
  const openURL = 'http://' + fqdnWithDnslink + sitePath
  const expectedURL = gw.customUri.spec + 'ipns/' + fqdnWithDnslink + sitePath

  dnsCache.put(fqdnWithDnslink, true) // mock: /api/v0/dns/ returned IPFS Path
  assert.equal(api.isDnslinkPresent(fqdnWithDnslink), true, 'fqdnWithDnslink should return true')

  prefs.dns = true
  gw.redirectEnabled = true

  tabs.open({
    url: openURL,
    onReady: function onReady (tab) {
      assert.equal(tab.url, expectedURL, 'expected redirect')
      tab.close(done)
    }
  })
}

exports['test DNS Cache expiration'] = function (assert) {
  const expired = Date.now() - 1000
  const key = 'foo.test'
  const value = true
  dnsCache.put(key, value, expired)
  assert.equal(dnsCache.get(key), value, 'dnsCache should be a map')
  dnsCache.dropExpired()
  assert.ok(typeof dnsCache.get(key) === 'undefined', 'dnsCache.dropExpired should drop regular key')
  assert.equal(dnsCache.get('127.0.0.1'), false, 'special key should not be dropped')
  assert.equal(dnsCache.get(prefs.customGatewayHost), false, 'special key should not be dropped')
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
