'use strict'
/* eslint-env browser, webextensions */

import { asyncIterateStream } from 'async-iterate-stream/asyncIterateStream'
// import streamHead from 'stream-head'

const { resolver } = require('ipfs-http-response')
const { mimeSniff } = require('./mime-sniff')
// const detectContentType = require('ipfs-http-response/src/utils/content-type')
const toArrayBuffer = require('to-arraybuffer')
const peek = require('buffer-peek-stream')
// const dirView = require('./dir-view')
const PathUtils = require('ipfs/src/http/gateway/utils/path')
const isStream = require('is-stream')

const textBuffer = (data) => new TextEncoder('utf-8').encode(data).buffer

/* protocol handler for mozilla/libdweb */

exports.createIpfsUrlProtocolHandler = (getIpfs, dnslinkResolver) => {
  return async (request) => {
    console.time('[ipfs-companion] LibdwebProtocolHandler')
    console.log(`[ipfs-companion] handling ${request.url}`)
    try {
      const ipfs = getIpfs()
      const url = request.url
      // Get /ipfs/ path for URL (resolve to immutable snapshot if ipns://)
      const path = immutableIpfsPath(url, dnslinkResolver)
      // Then, fetch response from IPFS
      const { content, contentType, contentEncoding } = await getResponse(ipfs, url, path)

      // console.log(`contentType=${contentType}, contentEncoding=${contentEncoding}, content`, content)

      return {
        contentEncoding,
        contentType,
        content: streamRespond(content)
      }
    } catch (err) {
      console.error(`[ipfs-companion] failed to get data for ${request.url}`, err)
      return {
        contentEncoding: 'utf-8',
        contentType: 'text/plain',
        content: streamRespond(toErrorResponse(request, err))
      }
    } finally {
      console.timeEnd('[ipfs-companion] LibdwebProtocolHandler')
    }
  }
}

async function * streamRespond (response) {
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
  // console.error(`IPFS Error while getting response for ${request.url}`, error)
  // TODO
  // - create proper error page
  // - find a way to communicate common errors (eg. not found, invalid CID, timeout)
  if (error.message === 'file does not exist') {
    // eg. when trying to access a non-existing file in a directory (basically http 404)
    return textBuffer('Not found')
  } else if (error.message === 'selected encoding not supported') {
    // eg. when trying to access invalid CID
    return textBuffer('IPFS Error: selected encoding is not supported in browser context.  Make sure your CID is a valid CIDv1 in Base32.')
  }
  return textBuffer(`Unable to produce IPFS response for "${request.url}": ${error}`)
}

function immutableIpfsPath (url, dnslinkResolver) {
  // TODO:
  // - detect invalid addrs and display error page

  // Move protocol to IPFS-like path
  let path = url.replace(/^([^:]+):\/\/*/, '/$1/')
  // Unescape special characters, eg. ipns://tr.wikipedia-on-ipfs.org/wiki/G%C3%BCne%C5%9F_r%C3%BCzg%C3%A2r%C4%B1.html
  path = decodeURI(path)
  // Handle IPNS (if present)
  if (path.startsWith('/ipns/')) {
    // js-ipfs does not implement  ipfs.name.resolve yet, so we only do dnslink lookup
    // const response = await ipfs.name.resolve(path, {recursive: true, nocache: false})
    const fqdn = path.split('/')[2]
    const dnslinkRecord = dnslinkResolver.readAndCacheDnslink(fqdn)
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
    // try direct resolver, then fallback to manual one
    const dag = await resolver.cid(ipfs, path)
    cid = dag.cid
    console.log('resolver.cid', cid.toBaseEncodedString())
  } catch (err) {
    // console.error('error in resolver.cid', err)
    // handle directories
    if (err.cid && err.message === 'This dag node is a directory') {
      const dirCid = err.cid
      console.log('resolver.directory', dirCid.toBaseEncodedString())
      const data = await resolver.directory(ipfs, url, dirCid)
      console.log('resolver.directory', Array.isArray(data) ? data : `returned '${typeof data}'`)
      // TODO: redirect so directory always end with `/`
      if (typeof data === 'string') {
        // return HTML with directory listing
        return {
          content: textBuffer(data),
          contentType: 'text/html',
          contentEncoding: 'utf-8'
        }
      } else if (Array.isArray(data)) {
        console.log('resolver.directory.indexes', data)
        // return first index file
        path = PathUtils.joinURLParts(path, data[0].name)
        return getResponse(ipfs, url, path)
      }
      throw new Error('Invalid output of resolver.directory')
    } else if (err.parentDagNode && err.missingLinkName) {
      // It may be legitimate error, but it could also be a part of hamt-sharded-directory
      // (example: ipns://tr.wikipedia-on-ipfs.org/wiki/Anasayfa.html)
      // which is not supported by resolver.cid from ipfs-http-response at this time.
      // Until ipfs.resolve support with sharding is added upstream, we use fallback below.
      // TODO remove this after ipfs-http-response switch to ipfs.resolve
      // or sharding is supported by some other means
      try {
        const matchingLink = (await ipfs.ls(err.parentDagNode, { resolveType: false })).find(item => item.name === err.missingLinkName)
        if (matchingLink) {
          console.log('resolver.cid.err.matchingLink', matchingLink)
          path = path.replace(matchingLink.path, matchingLink.hash)
          console.log('resolver.cid.err.path.after.matchingLink', path)
          cid = path
          // return getResponse(ipfs, url, path)
        } else {
          throw err
        }
      } catch (err) {
        console.error('Trying to recover from Error while resolver.cid', err)
        if (err.message === 'invalid node type') {
          throw new Error('hamt-sharded-directory support is spotty with js-ipfs at this time, try go-ipfs until a fix is found')
        } else {
          // TODO: investigate issue with js-ipfs and ipns://tr.wikipedia-on-ipfs.org/wiki/Anasayfa.html
          // (probably edge case relate to sharding)
          // For now we fallback to ipfs.files.catReadableStream(full path)
          cid = path
        }
      }
    } else {
      // unexpected issue, return error
      throw err
    }
  }

  // Efficient mime-sniff over initial bytes
  // const { stream, head } = await streamHead(ipfs.files.catReadableStream(cid), {bytes: 512})
  // const contentType = mimeSniff(head, new URL(url).pathname) || undefined
  // below old version with buffer-peek-stream
  const { stream, contentType } = await new Promise((resolve, reject) => {
    try {
      console.log(`ipfs.files.catReadableStream(${cid})`)
      const catStream = ipfs.files.catReadableStream(cid)
      peek(catStream, 512, (err, data, stream) => {
        if (err) return reject(err)
        const contentType = mimeSniff(data, new URL(url).pathname) || undefined
        // TODO: switch to upstream const contentType = detectContentType(new URL(url).pathname, data) || 'application/octet-stream'
        resolve({ stream, contentType })
      })
    } catch (err) {
      reject(err)
    }
  })
  console.log(`[ipfs-companion] [ipfs://] handler read ${path} and internally mime-sniffed it as ${contentType}`)

  return { content: stream, contentType }
}
