module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  var jsPaths = ['*.js', 'lib/**.js', 'test/**.js', 'data/**.js'];
  grunt.initConfig({
    eslint: {
      target: jsPaths
    },
    jsbeautifier: {
      files: ['data/**.html', 'data/**.css'].concat(jsPaths),
      options: {
        js: {
          braceStyle: 'collapse',
          breakChainedMethods: false,
          e4x: false,
          evalCode: false,
          indentChar: ' ',
          indentLevel: 0,
          indentSize: 2,
          indentWithTabs: false,
          jslintHappy: false,
          keepArrayIndentation: false,
          keepFunctionIndentation: false,
          maxPreserveNewlines: 10,
          preserveNewlines: true,
          spaceBeforeConditional: true,
          spaceInParen: false,
          unescapeStrings: false,
          wrapLineLength: 0,
          endWithNewline: true
        },
        html: {
          braceStyle: 'collapse',
          indentSize: 4,
          indentChar: ' ',
          indentScripts: 'keep',
          indentWithTabs: false,
          maxPreserveNewlines: 10,
          preserveNewlines: true,
          unformatted: ['a', 'sub', 'sup', 'b', 'i', 'u'],
          wrapLineLength: 0,
          endWithNewline: true
        },
        css: {
          indentSize: 4,
          indentChar: ' '
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
