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
      'add-on/src/lib/*.js',
      'add-on/dist/background/*.js',
      'test/unit/*.test.js'
    ],
    preprocessors: {
      'add-on/dist/**/*.js': ['babel', 'coverage']
    },
    babelPreprocessor: {
      options: {
        presets: ['es2017'],
        sourceMap: 'inline'
      },
      filename: function (file) {
        return file.originalPath.replace(/\.js$/, '.es2017.js')
      },
      sourceFileName: function (file) {
        return file.originalPath
      }
    },
    plugins: [
      'karma-babel-preprocessor',
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
