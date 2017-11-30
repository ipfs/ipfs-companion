const bl = require('bl')
const identifyStream = require('buffer-signature').identifyStream

exports.createIpfsUrlProtocolHandler = (getIpfs) => {
  return async (request, reply) => {
    console.time('[ipfs-companion] IpfsUrlProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)

    const path = request.url.split('ipfs://')[1]
    const ipfs = getIpfs()

    try {
      // TODO: disable mime type detection for now
      const mimeType = 'text/plain'
      const {data} = await getDataAndGuessMimeType(ipfs, path)
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
    ipfs.files.cat(path, (err, stream) => {
      if (err) return reject(err)

      let mimeType = null
      stream
        .pipe(identifyStream(info => { mimeType = info.mimeType }))
        .pipe(bl((err, data) => {
          if (err) return reject(err)
          resolve({mimeType, data: data.toString('utf8')})
        }))
    })
  })
}
