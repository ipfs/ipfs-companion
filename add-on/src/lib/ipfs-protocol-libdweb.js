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
        // Notes:
        // - omitted  contentType on purpose to enable mime-sniffing by browser
        //
        // TODO:
        // - support directory listing
        // - support streaming
        content: (async function * () {
          const data = await ipfs.files.cat(path)
          const mimeType = mimeSniff(data, path) || 'text/plain'
          console.log(`[ipfs-companion] [ipfs://] content generator read ${path} and internally mime-sniffed ${mimeType}`)
          yield toArrayBuffer(data)
        })()
      }
    } catch (err) {
      console.error('[ipfs-companion] failed to get data', err)
    }

    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
  }
}
