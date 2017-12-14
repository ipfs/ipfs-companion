const { caller } = require('postmsg-rpc')

window.ipfs = window.ipfs || {
  id: caller('ipfs.id')
}
