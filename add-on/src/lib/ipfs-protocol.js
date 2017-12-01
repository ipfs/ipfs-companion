const bl = require('bl')
const {mimeSniff} = require('./mime-sniff')

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
      if (res.pipe) {
        // is Stream! (js-ipfs is gonna return a buffer in the next release, bringing it inline with js-ipfs-api)
        res.pipe(bl((err, data) => {
          if (err) return reject(err)
          const mimeType = mimeSniff(data, path)
          resolve({mimeType, data: data.toString('utf8')})
        }))
      } else {
        // is buffer
        const mimeType = mimeSniff(res, path)
        resolve({mimeType, data: res.toString('utf8')})
      }
    })
  })
}
