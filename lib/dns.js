'use strict'

const prefs = require('sdk/simple-prefs').prefs
// const URL = require('sdk/url').URL
const api = require('./api.js')

function isIpfsEnabled (fqdn) {
  if (fqdn === '127.0.0.1' || fqdn === prefs.customGatewayHost) { // TODO: be smarter?
    return false
  }
  // TODO: add cache
  let ipfsSupport = api.isDnslinkPresent(fqdn)
  // console.log('dns.isIpfsEnabled(' + fqdn + ')=' + ipfsSupport)
  return ipfsSupport
}

exports.isIpfsEnabled = isIpfsEnabled
