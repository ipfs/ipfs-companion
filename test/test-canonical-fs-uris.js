'use strict'

const tabs = require('sdk/tabs')
const protocols = require('../lib/protocols.js')
const fsFactory = protocols.fs

protocols.register()

const fs = fsFactory.createInstance()
const gw = require('../lib/gateways.js')
const self = require('sdk/self')
const testpage = self.data.url('linkify-demo.html')
const sripage = 'fs:/ipfs/QmSrCRJmzE4zE1nAfWPbzVfanKQNBhp7ZWmMnEdbiLvYNh/mdown#sample.md'
const parent = require('sdk/remote/parent')

const childMain = require.resolve('../lib/child-main.js')

parent.remoteRequire(childMain)

const {Cc, Ci} = require('chrome')
const ioservice = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService)

ioservice.newURI('fs:/ipns/foo', null, null)

exports['test newURI'] = function (assert) {
  require('sdk/simple-prefs').prefs.fsUris = true

  assert.equal(fs.newURI('fs:/ipns/foo', null, null).spec, 'fs:/ipns/foo', 'keeps fs:/ uris as-is')
}

exports['test newChannel'] = function (assert) {
  require('sdk/simple-prefs').prefs.fsUris = true

  let uri = fs.newURI('fs:///ipns/foo', null, null)
  let chan = fs.newChannel(uri)

  assert.equal(chan.originalURI.spec, 'fs:/ipns/foo', "keeps fs: URI as channel's originalURI")

  // double and triple slashes lead to gateway redirects, which cause CORS troubles -> check normalization
  assert.equal(chan.URI.spec, 'https://ipfs.io/ipns/foo', 'channel has normalized http urls')
}

// https://github.com/lidel/ipfs-firefox-addon/issues/3
exports['test subresource loading'] = function (assert, done) {
  require('sdk/simple-prefs').prefs.fsUris = true
  gw.redirectEnabled = false

  tabs.open({
    url: testpage,
    onReady: (tab) => {

      // first load somehow doesn't have protocol handlers registered. so load resource:// first, then redirect to fs:/ page
      if (tab.url !== sripage) {
        tab.url = sripage
        tab.reload()
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

        require('sdk/simple-prefs').prefs.fsUris = false
        tab.close(done)
      })
    }
  })
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
