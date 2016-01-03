'use strict';

const tabs = require('sdk/tabs');
const parent = require('sdk/remote/parent');
const self = require('sdk/self');
const testpage = self.data.url('linkify-demo.html');

require("../lib/rewrite-pages.js");
parent.remoteRequire("resource://ipfs-firefox-addon-at-lidel-dot-org/lib/rewrite-pages.js");

exports["test link processing, plain text conversion"] = function(assert, done) {
  require('sdk/simple-prefs').prefs.linkify = true;

  tabs.open({
    url: testpage,
    onReady(tab) {
      let worker = tab.attach({
        contentScript: `
          self.port.emit("test result", {
            numLinks: document.querySelectorAll('#plain-links > a').length,
            relativeScheme: document.querySelector('#relative-ipfs-path').protocol
          })
        `
      });
      worker.port.on("test result", (msg) => {
        assert.equal(msg.numLinks|0, 4, 'number of linkified plaintext chunks');
        assert.equal(msg.relativeScheme, "fs:", 'relative ipfs reference rewritten to fs: scheme');

        tab.close(done);
      });
    }
  });
};

require('sdk/test').run(exports);
