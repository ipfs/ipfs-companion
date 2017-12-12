const promisify = require('es6-promisify')
const { proxifyClient } = require('../../lib/post-message-proxy')

window.ipfs = window.ipfs || {
  id: promisify(proxifyClient('id'))
}
