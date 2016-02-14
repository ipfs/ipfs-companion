module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt)
  var jsPaths = ['*.js', 'lib/**.js', 'test/**.js', 'data/**.js']
  grunt.initConfig({
    run: {
      jpm_test: {
        cmd: 'jpm',
        args: ['-b', process.env.FIREFOX_BIN || 'firefox', 'test', '--prefs', 'test/about-config.json']
      },
      eslint: {
        cmd: 'eslint',
        args: jsPaths
      }
    }
  })

  grunt.registerTask('test', ['run:jpm_test', 'run:eslint'])
  grunt.registerTask('default', ['test'])
}
// vim:ts=2:sw=2:et:
