const reporters = ['mocha', 'coverage']
if (process.env.COVERALLS_REPO_TOKEN) {
  reporters.push('coveralls')
}

module.exports = function (config) {
  config.set({
    singleRun: true,
    browsers: ['Firefox'],
    frameworks: ['mocha'],
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
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/sinon-chrome/dist/sinon-chrome.latest.js',
      'ext/src/background/*.js',
      'test/unit/*.test.js'
    ],
    preprocessors: {'ext/**/*.js': ['coverage']},
    plugins: [
      'karma-coveralls',
      'karma-coverage',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-mocha-reporter'
    ]
  })
}
