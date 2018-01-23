'use strict'
const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
let AccessControl

describe.only('access-control', () => {
  before(() => {
    global.browser = browser
    AccessControl = require('../../../../add-on/src/lib/ipfs-proxy/access-control')
  })

  beforeEach(() => browser.flush())

  it('should store access permissions', async () => {
    const accessControl = new AccessControl(browser.storage)
    let acl = await accessControl.getAcl()

    // Ensure ACL starts out empty
    expect(acl).to.deep.equal({})

    const sets = [
      ['http://ipfs.io', 'ipfs.files.add', true],
      ['https://ipld.io', 'ipfs.block.new', false],
      ['https://filecoin.io', 'ipfs.pubsub.subscribe', true]
    ]

    await Promise.all(sets.map(s => accessControl.setAccess(...s)))
    const gets = Promise.all(sets.map(s => accessControl.getAccess(...s.slice(0, -1))))

    gets.forEach((access, i) => {
      expect(access.origin).to.equal(sets[i][0])
      expect(access.permission).to.equal(sets[i][1])
      expect(access.allow).to.equal(sets[i][2])
    })
  })

  after(() => {
    delete global.browser
  })
})
