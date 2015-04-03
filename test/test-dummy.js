exports['test dummy'] = function(assert) {
  assert.pass('Unit test running!');
};
exports['test dummy async'] = function(assert, done) {
  assert.pass('async Unit test running!');
  done();
};

require('sdk/test').run(exports);
