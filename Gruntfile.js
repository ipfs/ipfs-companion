module.exports = function(grunt) {
  var paths = ['*.js', 'lib/*.js', 'test/*.js'];
  grunt.initConfig({
    jshint: {
      all: paths,
      options: {
        'jquery': true,
        'quotmark': 'single',
        'white': true,
        'indent': 2,
        'latedef': true,
        'unused': true,
        'moz': true,
        '-W097': true, // global strict
        'predef':[
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
      cfx_test: {
        cmd: 'bash',
        args: ['test/cfx_test_workaround_for_1103385.sh'],
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('default', ['jsbeautifier', 'jshint']);
  grunt.registerTask('travis', ['jshint', 'run:cfx_test']);
  //script: grunt travis --verbose

};
// vim:ts=2:sw=2:et:
