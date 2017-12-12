'use strict'
const { describe, it } = require('mocha')
const { expect } = require('chai')
const { createIpfsUrlProtocolHandler } = require('../../../add-on/src/lib/ipfs-protocol')

describe('ipfs-protocol', () => {
  it('should serve an IPFS file', async () => {
    const url = 'ipfs://QmQxeMcbqW9npq5h5kyE2iPECR9jxJF4j5x4bSRQ2phLY4'
    const content = 'TEST' + Date.now()
    const ipfs = { files: { cat: () => Promise.resolve(content) } }
    const handler = createIpfsUrlProtocolHandler(() => ipfs)
    const request = { url }

    const res = await new Promise(async (resolve, reject) => {
      try {
        await handler(request, resolve)
      } catch (err) {
        reject(err)
      }
    })

    expect(res.data).to.equal(content)
  })

  it('should serve a directory listing', async () => {
    const url = 'ipfs://QmQxeMcbqW9npq5h5kyE2iPECR9jxJF4j5x4bSRQ2phLY4'
    const links = [
      { name: `one${Date.now()}`, size: Date.now() },
      { name: `two${Date.now()}`, size: Date.now() },
      { name: `three${Date.now()}`, size: Date.now() }
    ]
    const ipfs = {
      files: { cat: () => Promise.reject(new Error('this dag node is a directory')) },
      ls: () => Promise.resolve(links)
    }
    const handler = createIpfsUrlProtocolHandler(() => ipfs)
    const request = { url }

    const res = await new Promise(async (resolve, reject) => {
      try {
        await handler(request, resolve)
      } catch (err) {
        reject(err)
      }
    })

    expect(res.mimeType).to.equal('text/html')
    expect(res.charset).to.equal('utf8')
    links.forEach((link) => expect(res.data).to.contain(`${url}/${link.name}`))
  })
})
