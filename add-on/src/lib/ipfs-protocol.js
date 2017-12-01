const bl = require('bl')
const { mimeSniff } = require('./mime-sniff')
const dirView = require('ipfs/src/http/gateway/dir-view')
const PathUtils = require('ipfs/src/http/gateway/utils/path')

exports.createIpfsUrlProtocolHandler = (getIpfs) => {
  return async (request, reply) => {
    console.time('[ipfs-companion] IpfsUrlProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)

    let path = request.url.replace('ipfs://', '/')

    if (path.indexOf('/ipfs') !== 0) {
      path = `/ipfs${path}`
    }

    const ipfs = getIpfs()

    try {
      const {data, mimeType} = await getDataAndGuessMimeType(ipfs, path)
      console.log(`[ipfs-companion] returning ${path} as ${mimeType}`)
      reply({mimeType, data})
    } catch (err) {
      console.error('[ipfs-companion] failed to get data', err)
      reply({mimeType: 'text/html', data: `Error ${err.message}`})
    }

    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
  }
}

function getDataAndGuessMimeType (ipfs, path) {
  return new Promise((resolve, reject) => {
    ipfs.files.cat(path, async (err, stream) => {
      if (err) {
        if (err.message.toLowerCase() === 'this dag node is a directory') {
          return resolve(await getDirectoryListingOrIndexData(ipfs, path))
        }
        return reject(err)
      }

      stream.pipe(bl((err, data) => {
        if (err) return reject(err)
        const mimeType = mimeSniff(data, path)
        resolve({mimeType, data: data.toString('utf8')})
      }))
    })
  })
}

async function getDirectoryListingOrIndexData (ipfs, path) {
  const listing = await ipfs.ls(path)
  const index = listing.find((l) => ['index.html', 'index.htm'].includes(l.name))

  if (index) {
    return getDataAndGuessMimeType(ipfs, PathUtils.joinURLParts(path, index.name))
  }

  return {mimeType: 'text/html', data: dirView.render(path.replace(/^\/ipfs/, ''), listing)}
}
