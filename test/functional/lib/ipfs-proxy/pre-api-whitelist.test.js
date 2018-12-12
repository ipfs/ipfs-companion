'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const { createPreApiWhitelist } = require('../../../../add-on/src/lib/ipfs-proxy/pre-api-whitelist')

describe('lib/ipfs-proxy/pre-api-whitelist', () => {
  before(() => {
    global.URL = URL
  })

  it('should throw early if access was not enabled via global API whitelist', async () => {
    const permission = 'config.show'
    const preApiWhitelist = createPreApiWhitelist(permission)

    let error

    try {
      await preApiWhitelist()
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw(`Access to '${permission}' commands over IPFS Proxy is globally blocked`)
  })

  it('should have a well-formed Error if denied', async () => {
    const permission = 'config.show'
    const preApiWhitelist = createPreApiWhitelist(permission)

    let error

    try {
      await preApiWhitelist()
    } catch (err) {
      error = err
    }

    expect(error.output.payload).to.deep.eql({
      isIpfsProxyError: true,
      isIpfsProxyWhitelistError: true,
      permissions: [permission]
    })
  })

  after(() => {
    delete global.URL
  })
})
