(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.module || (g.module = {})).exports = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// base-x encoding
// Forked from https://github.com/cryptocoinjs/bs58
// Originally written by Mike Hearn for BitcoinJ
// Copyright (c) 2011 Google Inc
// Ported to JavaScript by Stefan Thomas
// Merged Buffer refactorings from base58-native by Stephen Pair
// Copyright (c) 2013 BitPay Inc

/**
 * @param {string} ALPHABET
 * @return {encode: function, decode: function}
 */
module.exports = function base (ALPHABET) {
  var ALPHABET_MAP = {}
  var BASE = ALPHABET.length
  var LEADER = ALPHABET.charAt(0)

  // pre-compute lookup table
  for (var i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i
  }

  /**
   * @param {(Buffer|number[])} source
   * @return {string}
   */
  function encode (source) {
    if (source.length === 0) return ''

    var digits = [0]
    for (var i = 0; i < source.length; ++i) {
      var carry = (digits[0] << 8) + source[i]
      digits[0] = carry % BASE
      carry = (carry / BASE) | 0

      for (var j = 1; j < digits.length; ++j) {
        carry += digits[j] << 8
        digits[j] = carry % BASE
        carry = (carry / BASE) | 0
      }

      while (carry > 0) {
        digits.push(carry % BASE)
        carry = (carry / BASE) | 0
      }
    }

    // deal with leading zeros
    for (var k = 0; source[k] === 0 && k < source.length - 1; ++k) {
      digits.push(0)
    }

    // convert digits to a string
    for (var ii = 0, jj = digits.length - 1; ii <= jj; ++ii, --jj) {
      var tmp = ALPHABET[digits[ii]]
      digits[ii] = ALPHABET[digits[jj]]
      digits[jj] = tmp
    }

    return digits.join('')
  }

  /**
   * @param {string} string
   * @return {number[]}
   */
  function decode (string) {
    if (string.length === 0) return []

    var bytes = [0]
    for (var i = 0; i < string.length; i++) {
      var value = ALPHABET_MAP[string[i]]
      if (value === undefined) throw new Error('Non-base' + BASE + ' character')

      var carry = bytes[0] * BASE + value
      bytes[0] = carry & 0xff
      carry >>= 8

      for (var j = 1; j < bytes.length; ++j) {
        carry += bytes[j] * BASE
        bytes[j] = carry & 0xff
        carry >>= 8
      }

      while (carry > 0) {
        bytes.push(carry & 0xff)
        carry >>= 8
      }
    }

    // deal with leading zeros
    for (var k = 0; string[k] === LEADER && k < string.length - 1; ++k) {
      bytes.push(0)
    }

    return bytes.reverse()
  }

  return {
    encode: encode,
    decode: decode
  }
}

},{}],2:[function(require,module,exports){
var basex = require('base-x')
var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
var base58 = basex(ALPHABET)

module.exports = {
  encode: base58.encode,
  decode: base58.decode
}

},{"base-x":1}],3:[function(require,module,exports){
"use strict"

function invert(hash) {
  var result = {}
  for(var i in hash) {
    if(hash.hasOwnProperty(i)) {
      result[hash[i]] = i
    }
  }
  return result
}

module.exports = invert
},{}],4:[function(require,module,exports){
(function (Buffer){
var invert = require('invert-hash')

var mh = module.exports = function () {
  if (arguments.length === 1) {
    return mh.decode.apply(this, arguments)
  } else if (arguments.length > 1) {
    return mh.encode.apply(this, arguments)
  }

  throw new Error('multihash must be called with the encode or decode parameters.')
}

// the multihash tables

mh.names = {
  'sha1': 0x11,
  'sha2-256': 0x12,
  'sha2-512': 0x13,
  'sha3': 0x14,
  'blake2b': 0x40,
  'blake2s': 0x41
}

mh.codes = invert(mh.names)

mh.defaultLengths = {
  0x11: 20,
  0x12: 32,
  0x13: 64,
  0x14: 64,
  0x40: 64,
  0x41: 32
}

// encode(hashfn, [length,] digest)
mh.encode = function MultihashEncode (digest, hashfn, length) {
  if (!digest || !hashfn) {
    throw new Error('multihash encode requires at least two args: hashfn, digest')
  }

  // ensure it's a hashfunction code.
  hashfn = mh.coerceCode(hashfn)

  if (!(Buffer.isBuffer(digest))) {
    throw new Error('digest should be a Buffer')
  }

  if (!length) {
    length = digest.length
  }

  if (length && digest.length !== length) {
    throw new Error('digest length should be equal to specified length.')
  }

  if (length > 127) {
    throw new Error('multihash does not yet support digest lengths greater than 127 bytes.')
  }

  return Buffer.concat([new Buffer([hashfn, length]), digest])
}

// decode(mutlihash)
mh.decode = function MultihashDecode (multihash) {
  var err = mh.validate(multihash)
  if (err) {
    throw err
  }

  var output = {}
  output.code = multihash[0]
  output.name = mh.codes[output.code]
  output.length = multihash[1]
  output.digest = multihash.slice(2)
  return output
}

mh.validate = function validateMultihash (multihash) {
  if (!(Buffer.isBuffer(multihash))) {
    return new Error('multihash must be a Buffer')
  }

  if (multihash.length < 3) {
    return new Error('multihash too short. must be > 3 bytes.')
  }

  if (multihash.length > 129) {
    return new Error('multihash too long. must be < 129 bytes.')
  }

  if (!mh.isAppCode(multihash[0]) && !mh.codes[multihash[0]]) {
    return new Error('multihash unknown function code: 0x' + multihash[0].toString(16))
  }

  if (multihash.slice(2).length !== multihash[1]) {
    return new Error('multihash length inconsistent: 0x' + multihash.toString('hex'))
  }

  return false
}

mh.coerceCode = function coerceCode (hashfn) {
  var code = hashfn
  if (typeof hashfn === 'string') {
    if (!mh.names[hashfn]) {
      throw new Error('Unrecognized hash function named: ' + hashfn)
    }
    code = mh.names[hashfn]
  }

  if (typeof code !== 'number') {
    throw new Error('Hash function code should be a number. Got: ' + code)
  }

  if (!mh.codes[code] && !mh.isAppCode(code)) {
    throw new Error('Unrecognized function code: ' + code)
  }

  return code
}

mh.isAppCode = function isAppCode (code) {
  return code > 0 && code < 0x10
}

}).call(this,require("buffer").Buffer)
},{"buffer":undefined,"invert-hash":3}],"is-ipfs":[function(require,module,exports){
(function (Buffer){
const base58 = require('bs58')
const multihash = require('multihashes')

const urlPattern = /^https?:\/\/[^\/]+\/(ip(f|n)s)\/((\w+).*)/
const pathPattern = /^\/(ip(f|n)s)\/((\w+).*)/

function isMultihash (hash) {
  try {
    const buffer = new Buffer(base58.decode(hash))
    multihash.decode(buffer)
    return true
  } catch (e) {
    return false
  }
}

function isIpfs (input, pattern) {
  const match = input.match(pattern)
  if (!match) {
    return false
  }

  if (match[1] !== 'ipfs') {
    return false
  }

  const hash = match[4]
  return isMultihash(hash)
}

function isIpns (input, pattern) {
  const match = input.match(pattern)
  if (!match) {
    return false
  }

  if (match[1] !== 'ipns') {
    return false
  }

  return true
}

module.exports = {
  multihash: isMultihash,
  ipfsUrl: (url) => isIpfs(url, urlPattern),
  ipnsUrl: (url) => isIpns(url, urlPattern),
  url: (url) => (isIpfs(url, urlPattern) || isIpns(url, urlPattern)),
  urlPattern: urlPattern,
  ipfsPath: (path) => isIpfs(path, pathPattern),
  ipnsPath: (path) => isIpns(path, pathPattern),
  path: (path) => (isIpfs(path, pathPattern) || isIpns(path, pathPattern)),
  pathPattern: pathPattern,
  urlOrPath: (x) => (isIpfs(x, urlPattern) || isIpns(x, urlPattern) || isIpfs(x, pathPattern) || isIpns(x, pathPattern))
}

}).call(this,require("buffer").Buffer)
},{"bs58":2,"buffer":undefined,"multihashes":4}]},{},[])("is-ipfs")
});