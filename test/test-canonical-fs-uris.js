'use strict'

const { env } = require('sdk/system/environment')

const tabs = require('sdk/tabs')
const { prefs } = require('sdk/simple-prefs')

const fs = require('../lib/protocols.js').fs.createInstance()
const gw = require('../lib/gateways.js')
const self = require('sdk/self')
const testpage = self.data.url('linkify-demo.html')
const mdownPath = 'ipfs/QmSrCRJmzE4zE1nAfWPbzVfanKQNBhp7ZWmMnEdbiLvYNh/mdown#sample.md'
const sripage = 'fs:/' + mdownPath
const parent = require('sdk/remote/parent')

parent.remoteRequire('../lib/child-main.js', module)

const {Cc, Ci} = require('chrome')
const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)

ioservice.newURI('fs:/ipns/foo', null, null)

exports['test newURI'] = function (assert) {
  prefs.fsUris = true

  assert.equal(fs.newURI('fs:/ipns/foo', null, null).spec, 'fs:/ipns/foo', 'keeps fs:/ uris as-is')
}

exports['test newChannel'] = function (assert) {
  prefs.fsUris = true
  gw.redirectEnabled = false

  let uri = fs.newURI('fs:///ipns/foo', null, null)
  let chan = fs.newChannel(uri)

  assert.equal(chan.originalURI.spec, 'fs:/ipns/foo', "keeps fs: URI as channel's originalURI")

  // double and triple slashes lead to gateway redirects, which cause CORS troubles -> check normalization
  assert.equal(chan.URI.spec, gw.publicUri.spec + 'ipns/foo', 'redirect off, channel has normalized http urls')

  gw.redirectEnabled = true

  chan = fs.newChannel(uri)

  assert.equal(chan.URI.spec, gw.customUri.spec + 'ipns/foo', 'redirect on, channel has normalized http urls')
}

exports['test subresource loading'] = function (assert, done) {
  // Skip test at Travis, at it often fails due to network throttling
  // https://github.com/lidel/ipfs-firefox-addon/issues/79
  // pre-push git hook should be enough to catch any regressions
  if ('TRAVIS' in env && 'CI' in env) {
    done()
    return
  }

  prefs.fsUris = true
  gw.redirectEnabled = false

  tabs.open({
    url: testpage,
    onReady: (tab) => {
      // first load somehow doesn't have protocol handlers registered. so load resource:// first, then redirect to fs:/ page
      if (tab.url !== sripage) {
        tab.url = sripage
        return
      }

      let worker = tab.attach({
        contentScript: `
        let obs = new MutationObserver(function(mutations) {
          let result = (document.querySelector("#ipfs-markdown-reader") instanceof HTMLHeadingElement)
          self.port.emit("test result", {result: result})
        })
        obs.observe(document.body,{childList: true})
        `
      })
      worker.port.on('test result', (msg) => {
        assert.equal(msg.result, true, 'subresource loaded successfully')
        tab.close(done)
      })
    }
  })
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
