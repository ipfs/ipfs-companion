'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const AccessControl = require('../../../../add-on/src/lib/ipfs-proxy/access-control')
const Storage = require('mem-storage-area/Storage')
const { objToAcl } = require('../../../helpers/acl')

describe('lib/ipfs-proxy/access-control', () => {
  before(() => {
    global.URL = URL
  })

  it('should maintain ACL', async () => {
    const accessControl = new AccessControl(new Storage())
    let acl = await accessControl.getAcl()

    // Ensure ACL starts out empty
    expect(acl).to.deep.equal(new Map())

    const sets = [
      ['http://ipfs.io', 'ipfs.files.add', true],
      ['https://ipld.io', 'ipfs.object.new', false],
      ['https://filecoin.io', 'ipfs.pubsub.subscribe', true],
      ['https://filecoin.io', 'ipfs.pubsub.subscribe', false],
      ['https://filecoin.io', 'ipfs.pubsub.publish', true]
    ]

    await Promise.all(sets.map(s => accessControl.setAccess(...s)))

    const expectedAcl = objToAcl({
      'http://ipfs.io': {
        'ipfs.files.add': true
      },
      'https://ipld.io': {
        'ipfs.object.new': false
      },
      'https://filecoin.io': {
        'ipfs.pubsub.subscribe': false,
        'ipfs.pubsub.publish': true
      }
    })

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

  it('should not get access if origin is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.getAccess(null, 'ipfs.files.add')
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid origin')
  })

  it('should not get access if permission is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.getAccess('http://ipfs.io', 138)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid permission')
  })

  it('should return null for missing grant', async () => {
    const accessControl = new AccessControl(new Storage())
    const access = await accessControl.getAccess('http://ipfs.io', 'ipfs.files.add')

    expect(access).to.equal(null)
  })

  it('should not set access if origin is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.setAccess('NOT A VALID ORIGIN', 'ipfs.files.add', true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid origin')

    try {
      await accessControl.setAccess(138, 'ipfs.files.add', true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid origin')
  })

  it('should not set access if permission is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.setAccess('http://ipfs.io', 138, true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid permission')
  })

  it('should not set access if allow is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', 'true')
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid allow')
  })

  it('should emit change event when ACL changes', async () => {
    return new Promise(resolve => {
      const accessControl = new AccessControl(new Storage())

      accessControl.on('change', changes => {
        expect(changes).to.deep.equal(objToAcl({
          'http://ipfs.io': {
            'ipfs.files.add': false
          }
        }))
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

    expect(access).to.equal(null)
  })

  it('should revoke all granted access if no permission specified', async () => {
    const accessControl = new AccessControl(new Storage())

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    await accessControl.setAccess('http://ipfs.io', 'ipfs.block.put', false)

    let acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(objToAcl({
      'http://ipfs.io': {
        'ipfs.files.add': false,
        'ipfs.block.put': false
      }
    }))

    await accessControl.revokeAccess('http://ipfs.io')

    acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(objToAcl({ 'http://ipfs.io': {} }))
  })

  it('should not revoke access if origin is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.revokeAccess('NOT A VALID ORIGIN', 'ipfs.files.add')
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid origin')
  })

  it('should not revoke access if permission is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.revokeAccess('http://ipfs.io', 138)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid permission')
  })

  it('should destroy itself', () => {
    const accessControl = new AccessControl(new Storage())
    expect(() => accessControl.destroy()).to.not.throw()
  })

  after(() => {
    delete global.URL
  })
})
