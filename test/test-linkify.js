'use strict'

const tabs = require('sdk/tabs')
const self = require('sdk/self')
const testpage = self.data.url('linkify-demo.html')
const prefs = require('sdk/simple-prefs').prefs

exports['test link processing, plain text conversion'] = function (assert, done) {
  prefs.linkify = true
  prefs.fsUris = true

  tabs.open({
    url: testpage,
    onReady: (tab) => {
      // first load in test env doesn't have onload handlers registered (probably due to prefs-util.js harness).
      // this is quick hack to reload the page and work around test framework limitation
      if (tab.url !== testpage + '?foo') {
        tab.url = testpage + '?foo'
        return
      }
      let worker = tab.attach({
        contentScript: `
          self.port.emit('test result', {
            numLinks: document.querySelectorAll('#plain-links > a').length,
            relativeScheme: document.querySelector('#relative-ipfs-path').protocol
          })
        `
      })
      worker.port.on('test result', (msg) => {
        assert.equal(msg.numLinks | 0, 4, 'number of linkified plaintext chunks')
        assert.equal(msg.relativeScheme, 'fs:', 'relative ipfs reference rewritten to fs: scheme')

        tab.close(done)
      })
    }
  })
}

require('./prefs-util.js').isolateTestCases(exports)
require('sdk/test').run(exports)
