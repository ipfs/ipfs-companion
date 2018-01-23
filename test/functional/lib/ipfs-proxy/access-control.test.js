'use strict'
const { describe, it, beforeEach } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
const AccessControl = require('../../../../add-on/src/lib/ipfs-proxy/access-control')
const Storage = require('mem-storage-area/Storage')

describe('access-control', () => {
  beforeEach(() => browser.flush())

  it('should maintain ACL', async () => {
    const accessControl = new AccessControl(new Storage())
    let acl = await accessControl.getAcl()

    // Ensure ACL starts out empty
    expect(acl).to.deep.equal({})

    const sets = [
      ['http://ipfs.io', 'ipfs.files.add', true],
      ['https://ipld.io', 'ipfs.block.new', false],
      ['https://filecoin.io', 'ipfs.pubsub.subscribe', true],
      ['https://filecoin.io', 'ipfs.pubsub.subscribe', false],
      ['https://filecoin.io', 'ipfs.pubsub.publish', true]
    ]

    await Promise.all(sets.map(s => accessControl.setAccess(...s)))

    const expectedAcl = {
      'http://ipfs.io': [
        { origin: 'http://ipfs.io', permission: 'ipfs.files.add', allow: true }
      ],
      'https://ipld.io': [
        { origin: 'https://ipld.io', permission: 'ipfs.block.new', allow: false }
      ],
      'https://filecoin.io': [
        { origin: 'https://filecoin.io', permission: 'ipfs.pubsub.subscribe', allow: false },
        { origin: 'https://filecoin.io', permission: 'ipfs.pubsub.publish', allow: true }
      ]
    }

    acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(expectedAcl)
  })

  it('should get granted access for origin and permission', async () => {
    const accessControl = new AccessControl(new Storage())

    let access = await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', true)
    const expectedAccess = { origin: 'http://ipfs.io', permission: 'ipfs.files.add', allow: true }

    expect(access).to.deep.equal(expectedAccess)

    access = await accessControl.getAccess('http://ipfs.io', 'ipfs.files.add')

    expect(access).to.deep.equal(expectedAccess)
  })

  it('should return undefined for missing grant', async () => {
    const accessControl = new AccessControl(new Storage())
    const access = await accessControl.getAccess('http://ipfs.io', 'ipfs.files.add')

    expect(access).to.equal(undefined)
  })

  it('should emit change event when ACL changes', async () => {
    return new Promise(resolve => {
      const accessControl = new AccessControl(new Storage())

      accessControl.on('change', acl => {
        expect(acl).to.deep.equal({
          'http://ipfs.io': [
            { origin: 'http://ipfs.io', permission: 'ipfs.files.add', allow: false }
          ]
        })
        resolve()
      })

      accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    })
  })

  it('should not emit change event if storage change is not for ACL', async () => {
    return new Promise((resolve, reject) => {
      const storage = new Storage()
      const accessControl = new AccessControl(storage)

      accessControl.on('change', () => reject(new Error('Unexpected change event')))

      storage.local.set({ foo: 'bar' })

      setTimeout(resolve, 1000) // Probably enough time right?
    })
  })

  it('should revoke granted access', async () => {
    const accessControl = new AccessControl(new Storage())

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    let access = await accessControl.getAccess('http://ipfs.io', 'ipfs.files.add')

    expect(access).to.deep.equal({ origin: 'http://ipfs.io', permission: 'ipfs.files.add', allow: false })

    await accessControl.revokeAccess('http://ipfs.io', 'ipfs.files.add')

    access = await accessControl.getAccess('http://ipfs.io', 'ipfs.files.add')

    expect(access).to.equal(undefined)
  })

  it('should revoke all granted access if no permission specified', async () => {
    const accessControl = new AccessControl(new Storage())

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    await accessControl.setAccess('http://ipfs.io', 'ipfs.block.put', false)

    let acl = await accessControl.getAcl()

    expect(acl).to.deep.equal({
      'http://ipfs.io': [
        { origin: 'http://ipfs.io', permission: 'ipfs.files.add', allow: false },
        { origin: 'http://ipfs.io', permission: 'ipfs.block.put', allow: false }
      ]
    })

    await accessControl.revokeAccess('http://ipfs.io')

    acl = await accessControl.getAcl()

    expect(acl).to.deep.equal({ 'http://ipfs.io': [] })
  })

  it('should destroy itself', () => {
    const accessControl = new AccessControl(new Storage())
    expect(() => accessControl.destroy()).to.not.throw()
  })
})
