'use strict'
/* eslint-env browser, webextensions */

import {asyncIterateStream} from 'async-iterate-stream/asyncIterateStream'

const { resolver } = require('ipfs-http-response')
const { mimeSniff } = require('./mime-sniff')
const toArrayBuffer = require('to-arraybuffer')
const peek = require('buffer-peek-stream')
// const dirView = require('./dir-view')
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
  let cid
  try {
    // try direct resolver
    const dag = await resolver.cid(ipfs, path)
    // console.log('resolver.cid: ', dag)
    cid = dag.cid
  } catch (err) {
    const errorToString = err.toString()
    // handle directories
    if (errorToString === 'Error: This dag node is a directory') {
      const dirCid = err.cid
      const data = await resolver.directory(ipfs, url, dirCid)
      // console.log('resolver.directory', data)
      // TODO: redirect so directory always end with `/`
      if (typeof data === 'string') {
        // return HTML with directory listing
        return new TextEncoder('utf-8').encode(data).buffer
      } else if (Array.isArray(data)) {
        // return first index file
        path = PathUtils.joinURLParts(path, data[0].name)
        return getResponse(ipfs, url, path)
      }
      throw new Error('Invalid output of resolver.directory')
    }
    throw err
  }

  // Efficient mime-sniff over initial bytes
  // TODO: rignt now it is only logged, use contentType somehow
  const { stream, contentType } = await new Promise((resolve, reject) => {
    peek(ipfs.files.catReadableStream(cid), 512, (err, data, stream) => {
      if (err) return reject(err)
      const contentType = mimeSniff(data, url) || 'application/octet-stream'
      resolve({ stream, contentType })
    })
  })
  console.log(`[ipfs-companion] [ipfs://] handler read ${path} and internally mime-sniffed it as ${contentType}`)
  //
  return stream
}
