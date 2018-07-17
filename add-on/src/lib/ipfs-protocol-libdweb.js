'use strict'
/* eslint-env browser, webextensions */

// const { mimeSniff } = require('./mime-sniff')
const toArrayBuffer = require('to-arraybuffer')
const dirView = require('./dir-view')
const PathUtils = require('ipfs/src/http/gateway/utils/path')

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
        // - detect invalid addrs and display error page
        // - support streaming
        content: (async function * () {
          const data = await getIpfsData(ipfs, path)
          // uncomment below for additional mime-sniffing in userland
          // const mimeType = mimeSniff(data, path) || 'text/plain'
          // console.log(`[ipfs-companion] [ipfs://] content generator read ${path} and internally mime-sniffed ${mimeType}`)
          //
          yield data
        })()
      }
    } catch (err) {
      console.error('[ipfs-companion] failed to get data for ' + request.url, err)
    }

    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
  }
}

async function getIpfsData (ipfs, path) {
  let data
  try {
    data = await ipfs.files.cat(path)
  } catch (err) {
    if (err.message.toLowerCase() === 'this dag node is a directory') {
      return getDirectoryListingOrIndexData(ipfs, path)
    }
    throw err
  }
  return toArrayBuffer(data)
}

async function getDirectoryListingOrIndexData (ipfs, path) {
  const listing = await ipfs.ls(path)
  const index = listing.find((l) => ['index', 'index.html', 'index.htm'].includes(l.name))

  if (index) {
    return getIpfsData(ipfs, PathUtils.joinURLParts(path, index.name))
  }

  const response = dirView.render(path.replace(/^\/ipfs\//, 'ipfs://'), listing)
  const encoder = new TextEncoder('utf-8')
  return encoder.encode(response).buffer
}
