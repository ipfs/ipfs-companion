'use strict'

var gw = require('../lib/gateways.js')

require('../lib/redirects.js')

const tabs = require('sdk/tabs')
const ipfsPath = 'ipfs/QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/Makefile'
const ipnsPath = 'ipns/ipfs.git.sexy/'

exports['test enabled /ipfs/ redirect (old http gw)'] = function (assert, done) {
  // open Public Gateway URL and check if it gets redirected to gw.customUri
  gw.redirectEnabled = true
  // HTTP
  tabs.open({
    url: 'http://gateway.ipfs.io/' + ipfsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.customUri.spec + ipfsPath, 'expected redirect')
      tab.close(done)
    }
  })
}

exports['test enabled /ipfs/ redirect (old https gw)'] = function (assert, done) {
  // open Public Gateway URL and check if it gets redirected to gw.customUri
  gw.redirectEnabled = true
  // HTTPS
  tabs.open({
    url: 'https://gateway.ipfs.io/' + ipfsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.customUri.spec + ipfsPath, 'expected redirect')
      tab.close(done)
    }
  })
}

exports['test enabled /ipfs/ redirect (http gw)'] = function (assert, done) {
  // open Public Gateway URL and check if it gets redirected to gw.customUri
  gw.redirectEnabled = true
  // HTTP
  tabs.open({
    url: 'http://ipfs.io/' + ipfsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.customUri.spec + ipfsPath, 'expected redirect')
      tab.close(done)
    }
  })
}

exports['test enabled /ipfs/ redirect (https gw)'] = function (assert, done) {
  // open Public Gateway URL and check if it gets redirected to gw.customUri
  gw.redirectEnabled = true
  // HTTPS
  tabs.open({
    url: 'https://ipfs.io/' + ipfsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.customUri.spec + ipfsPath, 'expected redirect')
      tab.close(done)
    }
  })
}

exports['test disabled /ipfs/ redirect'] = function (assert, done) {
  // same check, but with disabled redirection
  gw.redirectEnabled = false
  tabs.open({
    url: gw.publicUri.spec + ipfsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.publicUri.spec + ipfsPath, 'no redirect expected')
      tab.close(done)
    }
  })
}

exports['test enabled /ipns/ redirect'] = function (assert, done) {
  // open Public Gateway URL and check if it gets redirected to gw.customUri
  gw.redirectEnabled = true
  tabs.open({
    url: gw.publicUri.spec + ipnsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.customUri.spec + ipnsPath, 'expected redirect')
      tab.close(done)
    }
  })
}

exports['test disabled /ipns/ redirect'] = function (assert, done) {
  // same check, but with disabled redirection
  gw.redirectEnabled = false
  tabs.open({
    url: gw.publicUri.spec + ipnsPath,
    onReady: function onReady (tab) {
      assert.equal(tab.url, gw.publicUri.spec + ipnsPath, 'no redirect expected')
      tab.close(done)
    }
  })
}

exports['test isIPFS helper'] = function (assert) {
  assert.equal(gw.isIPFS(gw.publicUri.spec + ipfsPath), true, 'IPFS path at public gateway should be a positive match')
  assert.equal(gw.isIPFS(gw.customUri.spec + ipfsPath), true, 'IPFS path at custom gateway should be a positive match')
  assert.equal(gw.isIPFS('https://fooo.bar/' + ipfsPath), true, 'Paths that look IPFS-ish should be a positive match')
  assert.equal(gw.isIPFS('http://fooo.bar/' + ipfsPath), true, 'Paths that look IPFS-ish should be a positive match')
  assert.equal(gw.isIPFS(gw.apiUri.spec + ipfsPath), false, 'API resources should not be a positive match')
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
