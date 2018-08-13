'use strict'
/* eslint-env browser, webextensions */

const docSniff = require('doc-sniff')
const fileType = require('file-type')
const mime = require('mime-types')

/*
 * A quick, best effort mime sniffing fn, via:
 * @see https://github.com/sindresorhus/file-type
 * @see https://github.com/bitinn/doc-sniff
 *
 *  buffer => 'mime/type'
 *
 * TODO: https://mimesniff.spec.whatwg.org/
 */
exports.mimeSniff = function (buff, path) {
  // deals with buffers, and uses magic number detection
  const fileTypeRes = fileType(buff)
  if (fileTypeRes) {
    const pathSniffRes = mime.lookup(path)
    if (fileTypeRes.mime === 'application/xml' && pathSniffRes === 'image/svg+xml') {
      // detected SVGs
      return pathSniffRes
    }
    return fileTypeRes.mime
  }

  const str = buff.toString('utf8')

  // minimal whatwg style doc sniff.
  const docSniffRes = docSniff(false, str)

  if (docSniffRes === 'text/plain' && mime.lookup(path) === 'text/markdown') {
    // force plain text, otherwise browser triggers download of .md files
    return 'text/plain'
  }

  if (!docSniffRes || docSniffRes === 'text/plain') {
    // fallback to guessing by file extension
    return mime.lookup(path)
  } else {
    return docSniffRes
  }
}
