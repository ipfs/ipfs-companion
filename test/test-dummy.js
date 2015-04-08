'use strict';

/*  For some reason this dummy test fails on Firefox 34.0 :-)))
 *  https://travis-ci.org/lidel/ipfs-firefox-addon/jobs/57699234
 *
exports['test dummy'] = function(assert) {
  assert.pass('Unit test running!');
};
*/

exports['test dummy async'] = function(assert, done) {
  assert.pass('async Unit test running!');
  done();
};

require('sdk/test').run(exports);
