const ipfs = require('ipfs')

/*
 * A temporary feature flag while we test out js-ipfs support
 * `require('ipfs')` will return an empty object if js-ipfs has been disabled
 *
 * Remove `browser: { ipfs: false }` from package.json to enable embedded
 * js-ipfs support.
 */
module.exports = function isJsIpfsEnabled () {
  return Object.keys(ipfs).length > 0
}
