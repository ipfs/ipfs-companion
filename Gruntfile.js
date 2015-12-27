module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  var paths = ['*.js', 'lib/*.js', 'test/*.js'];
  grunt.initConfig({
    eslint: {
      target: paths
    },
    jsbeautifier: {
      files: paths,
      options: {
        js: {
          indentSize: 2,
          indentChar: ' ',
          indentWithTabs: false,
          endWithNewline: true
        }
      }
    },
    run: {
      jpm_test: {
        cmd: 'jpm',
        args: ['-b', process.env.FIREFOX_BIN || 'firefox', 'test']
      }
    }
  });

  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('travis', ['run:jpm_test', 'eslint']);
  grunt.registerTask('default', ['jsbeautifier', 'travis']);

};
// vim:ts=2:sw=2:et:
