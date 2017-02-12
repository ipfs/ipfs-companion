const reporters = ['mocha', 'coverage']
if (process.env.COVERALLS_REPO_TOKEN) {
  reporters.push('coveralls')
}

module.exports = function (config) {
  config.set({
    singleRun: true,
    concurrency: Infinity,
    browsers: ['Firefox'],
    frameworks: ['mocha', 'chai', 'sinon'],
    reporters,
    coverageReporter: {
      dir: 'build/coverage',
      reporters: [
        {
          type: 'lcov',
          subdir: 'lcov'
        },
        {
          type: 'html',
          subdir (browser) {
            // normalization process to keep a consistent browser name
            // across different OS
            return browser.toLowerCase().split(/[ /-]/)[0]
          }
        }, {type: 'text-summary'}
      ]
    },
    files: [
      'node_modules/sinon-chrome/bundle/sinon-chrome-webextensions.min.js',
      'test/unit/*.shim.js',
      'add-on/src/lib/npm/is-ipfs.min.js',
      'add-on/src/lib/npm/ipfs-api.min.js',
      'add-on/src/lib/npm/lru.js',
      'add-on/src/lib/*.js',
      'add-on/src/background/*.js',
      'test/unit/*.test.js'
    ],
    preprocessors: {'add-on/**/!(npm)/*.js': ['coverage']},
    plugins: [
      'karma-coveralls',
      'karma-coverage',
      'karma-firefox-launcher',
      'karma-chai',
      'karma-sinon',
      'karma-mocha',
      'karma-mocha-reporter'
    ]
  })
}
