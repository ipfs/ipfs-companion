'use strict'
/* eslint-env browser, webextensions */

import {asyncIterateStream} from 'async-iterate-stream/asyncIterateStream'

const { mimeSniff } = require('./mime-sniff')
const toArrayBuffer = require('to-arraybuffer')
const peek = require('buffer-peek-stream')
const dirView = require('./dir-view')
const PathUtils = require('ipfs/src/http/gateway/utils/path')
const isStream = require('is-stream')

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
        content: streamRespond(ipfs, path)
      }
    } catch (err) {
      console.error('[ipfs-companion] failed to get data for ' + request.url, err)
    }

    console.timeEnd('[ipfs-companion] IpfsUrlProtocolHandler')
  }
}

async function * streamRespond (ipfs, path) {
  const response = await getResponse(ipfs, path)
  if (isStream(response)) {
    for await (const chunk of asyncIterateStream(response, false)) {
    // for await (const chunk of new S2A(response)) {
      // Buffer to ArrayBuffer
      yield toArrayBuffer(chunk)
    }
  } else {
    // just a buffer
    yield response
  }
}

/*
function toAsyncIterator(stream) {
  // console.log('toAsyncIterator.stream', stream)
  //const s2a = new S2A(stream)
  const s2a = asyncIterateStream(stream, false)
  // console.log('toAsyncIterator.s2a', s2a)
  return s2a
}
*/

async function getResponse (ipfs, path) {
  let listing

  // We're using ipfs.ls to figure out if a path is a file or a directory.
  //
  // If the listing is empty then it's (likely) a file
  // If the listing has 1 entry then it's a directory
  // If the listing has > 1 entry && all the paths are the same then directory
  // else file
  //
  // It's not pretty, but the alternative is to use the object or dag API's
  // and inspect the data returned by them to see if it's a file or dir.
  //
  // Right now we can't use either of these because:
  // 1. js-ipfs object API does not take paths (only cid)
  // 2. js-ipfs-api does not support dag API at all
  //
  // The second alternative would be to resolve the path ourselves using the
  // object API, but that could take a while for long paths.
  try {
    listing = await ipfs.ls(path)
  } catch (err) {
    if (err.message === 'file does not exist') {
     // eg. when trying to access a non-existing file in a directory
      return new TextEncoder('utf-8').encode('Not found').buffer
    }
    throw err
  }

  if (isDirectory(listing)) {
    return getDirectoryListingOrIndexResponse(ipfs, path, listing)
  }

  // Efficient mime-sniff over initial bytes
  // TODO: rignt now it is only logged, use contentType somehow
  const { stream, contentType } = await new Promise((resolve, reject) => {
    peek(ipfs.files.catReadableStream(path), 512, (err, data, stream) => {
      if (err) return reject(err)
      const contentType = mimeSniff(data, path) || 'text/plain'
      resolve({ stream, contentType })
    })
  })
  console.log(`[ipfs-companion] [ipfs://] handler read ${path} and internally mime-sniffed it as ${contentType}`)
  //
  return stream
}

function isDirectory (listing) {
  if (!listing.length) return false
  if (listing.length === 1) return true
  // If every path in the listing is the same, IPFS has listed blocks for a file
  // if not then it is a directory listing.
  const path = listing[0].path
  return !listing.every(f => f.path === path)
}

function getDirectoryListingOrIndexResponse (ipfs, path, listing) {
  const indexFileNames = ['index', 'index.html', 'index.htm']
  const index = listing.find((l) => indexFileNames.includes(l.name))

  if (index) {
    /* TODO: pass mime-type to libdweb somehow?
    let contentType = 'text/plain'
    if (index.name.endsWith('.html') || index.name.endsWith('.htm')) {
      contentType = 'text/html'
    }
    */
    return ipfs.files.catReadableStream(PathUtils.joinURLParts(path, index.name))
  }
  const response = dirView.render(path.replace(/^\/ipfs\//, 'ipfs://'), listing)
  return new TextEncoder('utf-8').encode(response).buffer
}
