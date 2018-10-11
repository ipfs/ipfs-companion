// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext
module.exports = {
  // Global options:
  verbose: false,
  artifactsDir: 'build/',
  sourceDir: 'add-on/',
  ignoreFiles: [
    'src/',
    'libdweb/',
    '*.map',
    'manifest.*.json'
  ],
  // Command options:
  build: {
    overwriteDest: true
  }
}
