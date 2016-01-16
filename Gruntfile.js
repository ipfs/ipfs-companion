module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt)
  var jsPaths = ['*.js', 'lib/**.js', 'test/**.js', 'data/**.js']
  grunt.initConfig({
    eslint: {
      target: jsPaths
    },
    run: {
      jpm_test: {
        cmd: 'jpm',
        args: ['-b', process.env.FIREFOX_BIN || 'firefox', 'test']
      }
    }
  })

  grunt.registerTask('test', ['run:jpm_test', 'eslint'])
  grunt.registerTask('default', ['test'])
}
// vim:ts=2:sw=2:et:
