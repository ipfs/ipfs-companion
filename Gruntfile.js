module.exports = function(grunt) {
  var paths = ['*.js', 'lib/*.js', 'test/*.js'];
  grunt.initConfig({
    jshint: {
      all: paths,
      options: {
        'esnext': true,
        'jquery': true,
        'white': true,
        'indent': 2,
        'latedef': true,
        'unused': true,
        'moz': true,
        '-W097': true, // global strict
        'predef': [
          'exports',
          'require',
        ],
      },
    },
    jsbeautifier: {
      files: paths,
      options: {
        js: {
          indentSize: 2,
          indentChar: ' ',
          indentWithTabs: false,
          endWithNewline: true,
        },
      }
    },
    run: {
      jpm_test: {
        cmd: 'jpm',
        args: ['test'],
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('default', ['jsbeautifier', 'jshint']);
  grunt.registerTask('travis', ['jshint', 'run:jpm_test']);
  //script: grunt travis --verbose

};
// vim:ts=2:sw=2:et:
