const { mimeSniff } = require('./mime-sniff')

exports.createIpfsUrlProtocolHandler = (getIpfs) => {
  return async (request, reply) => {
    console.time('[ipfs-companion] IpfsUrlProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)

    const path = request.url.split('ipfs://')[1]
    const ipfs = getIpfs()

    try {
      const {data, mimeType} = await getDataAndGuessMimeType(ipfs, path)
      console.log(`[ipfs-companion] returning ${path} as ${mimeType}`)
      reply({mimeType, data})
    } catch (err) {
      reply({mimeType: 'text/html', data: `Error ${err.message}`})
    }

    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
  }
}

function getDataAndGuessMimeType (ipfs, path) {
  return new Promise((resolve, reject) => {
    ipfs.files.cat(path, (err, res) => {
      if (err) return reject(err)
      const mimeType = mimeSniff(res, path)
      resolve({mimeType, data: res.toString('utf8')})
    })
  })
}
