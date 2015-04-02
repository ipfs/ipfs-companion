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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsbeautifier');

  grunt.registerTask('default', ['jsbeautifier', 'jshint']);

};
// vim:ts=2:sw=2:et:
