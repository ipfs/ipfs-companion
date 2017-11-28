const embedded = require('./embedded')
const external = require('./external')

let client = null

exports.initIpfsClient = async function (opts) {
  if (client) client.destroy()
  if (opts.type === 'external') {
    client = await external.init()
  } else {
    client = await embedded.init()
  }
  return client
}
