'use strict'

function safeIpfsPath (urlOrPath) {
  // better safe than sorry: https://github.com/ipfs/ipfs-companion/issues/303
  return decodeURIComponent(urlOrPath.replace(/^.*(\/ip(f|n)s\/.+)$/, '$1'))
}

exports.safeIpfsPath = safeIpfsPath
