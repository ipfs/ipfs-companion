const identifyBuffer = require('buffer-signature').identify

exports.createIpfsUrlProtocolHandler = (getIpfs) => {
  return async (request, reply) => {
    console.time('[ipfs-companion] IpfsUrlProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)

    const path = request.url.split('ipfs://')[1]
    const ipfs = getIpfs()
    const { mimeType, data, charset } = await catFromIpfs(ipfs, path)

    console.log(`[ipfs-companion] returning ${path} as ${mimeType} ${charset}`)
    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
    reply({ mimeType, data, charset })
  }
}

async function catFromIpfs (ipfs, path) {
  try {
    const stream = await ipfs.files.cat(path)
    console.debug(`[ipfs-companion] ipfs.files.cat returned a stream for ${path}`)

    const res = await getMimeTypeAndData(stream)
    console.debug(`[ipfs-companion] mimeType guessed as ${res.mimeType} for ${path}`)

    return res
  } catch (err) {
    console.log('Error', err)
    return { mimeType: 'text/html', data: `Error ${err.message}` }
  }
}

async function getMimeTypeAndData (stream) {
  let buffs = []

  stream.on('data', (buff) => {
    console.debug(`[ipfs-companion] data event from stream`)
    buffs.push(buff)
  })

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => reject(err))

    stream.on('end', () => {
      console.debug(`[ipfs-companion] end event from stream`)
      const data = Buffer.concat(buffs)
      const mimeType = identifyBuffer(data).mimeType
      resolve({mimeType, data: data.toString('utf8'), charset: 'utf8'})
    })
  })
}

exports.getMimeTypeAndData = getMimeTypeAndData
