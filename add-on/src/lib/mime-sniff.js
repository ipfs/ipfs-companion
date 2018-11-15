const docSniff = require('doc-sniff')
const fileType = require('file-type')
const isSvg = require('is-svg')
const mime = require('mime-types')

/*
 * A quick, best effort mime sniffing fn, via:
 * @see https://github.com/sindresorhus/file-type
 * @see https://github.com/sindresorhus/is-svg
 * @see https://github.com/bitinn/doc-sniff
 *
 *  buffer => 'mime/type'
 *
 * TODO: https://mimesniff.spec.whatwg.org/
 */
exports.mimeSniff = function (buff, path) {
  // deals with buffers, and uses magic number detection
  const fileTypeRes = fileType(buff instanceof Uint8Array ? buff : new Uint8Array(buff))
  if (fileTypeRes) return fileTypeRes.mime

  const str = buff.toString('utf8')

  // You gotta read the file to figure out if something is an svg
  if (isSvg(str)) return 'image/svg+xml'

  // minimal whatwg style doc sniff.
  const docSniffRes = docSniff(false, str)

  if (!docSniffRes || docSniffRes === 'text/plain') {
    // fallback to guessing by file extension
    return mime.lookup(path)
  } else {
    return docSniffRes
  }
}
