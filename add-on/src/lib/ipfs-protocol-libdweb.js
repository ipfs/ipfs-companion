const { mimeSniff } = require('./mime-sniff')
const toArrayBuffer = require('to-arraybuffer')

/* protocol handler for mozilla/libdweb */

exports.createIpfsUrlProtocolHandler = (getIpfs) => {
  return request => {
    console.time('[ipfs-companion] IpfsUrlProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)

    let path = request.url.replace('ipfs://', '/')
    path = path.startsWith('/ipfs') ? path : `/ipfs${path}`
    const ipfs = getIpfs()

    try {
      return {
        // TODO:
        // - support directory listing
        // - support streaming
        // - either support mime-sniffing of read data in userland,
        //   or fix crash when contentType is omited (https://github.com/mozilla/libdweb/issues/20)
        contentType: 'image/jpeg',
        content: (async function * () {
          const data = await ipfs.files.cat(path)
          const mimeType = mimeSniff(data, path) || 'text/plain'
          console.log(`[ipfs-companion] ipfs:// content generator read ${path} and mime-sniffed ${mimeType}`)
          yield toArrayBuffer(data)
        })()
      }
    } catch (err) {
      console.error('[ipfs-companion] failed to get data', err)
    }

    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
  }
}
