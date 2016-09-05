'use strict'

const { prefs } = require('sdk/simple-prefs')
const { setInterval, clearInterval } = require('sdk/timers')

const cache = new Map()
const ttl = 12 * 60 * 60 * 1000

// let hits = 0
// let misses = 0

exports.put = function (key, value, expire) {
  cache.set(key, { value: value, expire: (expire || Date.now() + ttl) })
  // console.log('cache.put: ' + key)
  return value
}
exports.get = function (key) {
  const data = cache.get(key)
  if (typeof data !== 'undefined') {
    // hits++
    // console.log('cache.hit: ' + key)
    return data.value
  } else {
    // misses++
    // console.log('cache.miss: ' + key)
    return undefined
  }
}
exports.has = function (key) {
  // console.log('cache.has(' + key + ')=' + cache.has(key) + ' (value: ' + exports.get(key) + ')')
  return cache.has(key)
}
exports.dropExpired = function () {
  // console.log('cache.size=' + cache.size)
  // console.log('cache.hits=' + hits)
  // console.log('cache.misses=' + misses)
  // console.log('cache.dropExpired..')
  for (let [key, data] of cache) {
    if (data.expire && data.expire < Date.now()) {
      // console.log('cache.drop: ' + key)
      cache.delete(key)
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
  } else {
    cache.clear()
  }
  return f
})())

// precache the obvious ones
exports.put('127.0.0.1', false, null)
exports.put('::1', false, null)
exports.put('localhost', false, null)
