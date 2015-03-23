module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      all: ['*.js', 'test/**/*.js'],
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
      files: ['*.js', 'test/*.js'],
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
