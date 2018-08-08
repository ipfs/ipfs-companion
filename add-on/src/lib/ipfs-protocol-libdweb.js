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

exports.createIpfsUrlProtocolHandler = (getIpfs, dnsLink) => {
  return request => {
    console.time('[ipfs-companion] LibdwebProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)

    try {
      return {
        // Notes:
        // - omitted  contentType on purpose to enable mime-sniffing by browser
        //
        // TODO:
        // - detect invalid addrs and display error page
        content: streamRespond(getIpfs, dnsLink, request)
      }
    } catch (err) {
      console.error(`[ipfs-companion] failed to get data for ${request.url}`, err)
    }
    console.timeEnd('[ipfs-companion] LibdwebProtocolHandler')
  }
}

async function * streamRespond (getIpfs, dnsLink, request) {
  let response
  try {
    const ipfs = getIpfs()
    const url = request.url
    // Get /ipfs/ path for URL (resolve to immutable snapshot if ipns://)
    const path = immutableIpfsPath(url, dnsLink)
    // Then, fetch response from IPFS
    response = await getResponse(ipfs, url, path)
  } catch (error) {
    yield toErrorResponse(request, error)
    return
  }
  if (isStream(response)) {
    for await (const chunk of asyncIterateStream(response, false)) {
      // Buffer to ArrayBuffer
      yield toArrayBuffer(chunk)
    }
  } else {
    // just a buffer
    yield response
  }
}

// Prepare response with a meaningful error
function toErrorResponse (request, error) {
  console.error(`IPFS Error while getting response for ${request.url}`, error)
  // TODO
  // - create proper error page
  // - find a way to communicate common errors (eg. not found, invalid CID, timeout)
  const textBuffer = text => new TextEncoder('utf-8').encode(text).buffer
  if (error.message === 'file does not exist') {
    // eg. when trying to access a non-existing file in a directory (basically http 404)
    return textBuffer('Not found')
  } else if (error.message === 'selected encoding not supported') {
    // eg. when trying to access invalid CID
    return textBuffer('IPFS Error: selected encoding is not supported in browser context.  Make sure your CID is a valid CIDv1 in Base32.')
  }
  return textBuffer(`Unable to produce IPFS response for "${request.url}": ${error}`)
}

function immutableIpfsPath (url, dnsLink) {
  // Move protocol to IPFS-like path
  let path = url.replace(/^([^:]+):\/\/*/, '/$1/')
  // Handle IPNS (if present)
  if (path.startsWith('/ipns/')) {
    // js-ipfs does not implement  ipfs.name.resolve yet, so we only do dnslink lookup
    // const response = await ipfs.name.resolve(path, {recursive: true, nocache: false})
    const fqdn = path.split('/')[2]
    const dnslinkRecord = dnsLink.cachedDnslinkLookup(fqdn)
    if (!dnslinkRecord) {
      throw new Error(`Missing DNS TXT with dnslink for '${fqdn}'`)
    }
    path = path.replace(`/ipns/${fqdn}`, dnslinkRecord)
  }
  return path
}

async function getResponse (ipfs, url, path) {
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
  const listing = await ipfs.ls(path)

  if (isDirectory(listing)) {
    return getDirectoryListingOrIndexResponse(ipfs, url, path, listing)
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

function getDirectoryListingOrIndexResponse (ipfs, url, path, listing) {
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

  const response = dirView.render(url, listing)
  return new TextEncoder('utf-8').encode(response).buffer
}
