'use strict';

var gw = require('./gateways.js');
var gui = require('./gui.js');
const tabs = require('sdk/tabs');
const path = 'ipfs/QmTkzDwWqPbnAh5YiV5VwcTLnGdwSNsNTn2aDxdXBFca7D/example#/ipfs/QmSsNVuALPa1TW1GDahup8fFDqo95iFyPE7E6HpqDivw3p/readme.md';
const button = gui.toggleButton;

exports['test enabled redirect'] = function(assert, done) {
  // open Public Gateway URL and check if it gets redirected to gw.customUri()
  gw.enableHttpGatewayRedirect(button);
  tabs.open({
    url: gw.publicUri().spec + path,
    onReady: function onReady(tab) {
      assert.equal(tab.url, gw.customUri().spec + path, 'expected redirect');
      tab.close(done);
    }
  });

};


exports['test disabled redirect'] = function(assert, done) {
  // same check, but with disabled redirection
  gw.enableHttpGatewayRedirect(button);
  gw.disableHttpGatewayRedirect(button);
  tabs.open({
    url: gw.publicUri().spec + path,
    onReady: function onReady(tab) {
      assert.equal(tab.url, gw.publicUri().spec + path, 'no redirect expected');
      gw.enableHttpGatewayRedirect(button);
      tab.close(done);
    }
  });
};

require('sdk/test').run(exports);
