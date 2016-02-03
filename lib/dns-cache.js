'use strict'

const { prefs } = require('sdk/simple-prefs')
const { setInterval, clearInterval } = require('sdk/timers')

const cache = Object.create(null)
const ttl = 30 * 60 * 1000

let size = 0
let hits = 0
let misses = 0

exports.put = function (key, value, expire) {
  if (!cache[key]) { size++ }
  cache[key] = { value: value, expire: (expire || Date.now() + ttl) }
  // console.log('cache.put: ' + key)
  return value
}
exports.get = function (key) {
  const data = cache[key]
  if (typeof data !== 'undefined') {
    hits++
    // console.log('cache.hit: ' + key)
    return data.value
  } else {
    misses++
    // console.log('cache.miss: ' + key)
    return undefined
  }
}
exports.dropExpired = function () {
  // console.log('cache.size=' + size)
  // console.log('cache.hits=' + hits)
  // console.log('cache.misses=' + misses)
  // console.log('cache.dropExpired..')
  for (let key in cache) {
    const data = cache[key]
    if (data.expire && data.expire < Date.now()) {
      // console.log('cache.drop: ' + key)
      delete cache[key]
      cache.size--
    }
  }
}
exports.ttl = ttl

// execute on startup and then on every preference change
let cleanup = null
require('sdk/simple-prefs').on('dns', (function f () {
  clearInterval(cleanup)
  if (prefs.dns) {
    cleanup = setInterval(exports.dropExpired, exports.ttl)
  }
  return f
})())

// blacklist hosts which may confuse gateway
exports.put('127.0.0.1', false, null)
exports.put(prefs.customGatewayHost, false, null)
