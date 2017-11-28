const IpfsApi = require('ipfs-api')

exports.init = async function (opts) {
  const url = new window.URL(opts.ipfsApiUrl)
  const api = IpfsApi({host: url.hostname, port: url.port, procotol: url.protocol})
  return api
}

exports.destroy = async function () {
  return Promise.resolve()
}
