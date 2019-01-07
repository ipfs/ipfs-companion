'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const { createPreCommand } = require('../../../../add-on/src/lib/ipfs-proxy/pre-command')

describe('lib/ipfs-proxy/pre-command', () => {
  before(() => {
    global.URL = URL
  })

  it('should throw early if access was not enabled via global API whitelist', async () => {
    const permission = 'config.show'
    const preApiWhitelist = createPreCommand(permission)

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
    const preApiWhitelist = createPreCommand(permission)

    let error

    try {
      await preApiWhitelist()
    } catch (err) {
      error = err
    }

    expect(error.output.payload).to.deep.eql({
      code: 'ERR_IPFS_PROXY_ACCESS_DENIED',
      permissions: [permission],
      isIpfsProxyWhitelistError: true, // deprecated
      permission // deprecated
    })
  })

  after(() => {
    delete global.URL
  })
})
