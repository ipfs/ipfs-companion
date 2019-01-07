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
      ['http://ipfs.io/', 'ipfs.files.add', true],
      ['https://ipld.io/', 'ipfs.object.new', false],
      ['https://filecoin.io/', 'ipfs.pubsub.subscribe', true],
      ['https://filecoin.io/', 'ipfs.pubsub.subscribe', false],
      ['https://filecoin.io/', 'ipfs.pubsub.publish', true]
    ]

    await Promise.all(sets.map(s => accessControl.setAccess(...s)))

    const expectedAcl = objToAcl({
      'http://ipfs.io/': {
        'ipfs.files.add': true
      },
      'https://ipld.io/': {
        'ipfs.object.new': false
      },
      'https://filecoin.io/': {
        'ipfs.pubsub.subscribe': false,
        'ipfs.pubsub.publish': true
      }
    })

    acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(expectedAcl)
  })

  it('should allow access for wildcard allow', async () => {
    const accessControl = new AccessControl(new Storage())
    let access = await accessControl.getAccess('https://ipfs.io/', 'files.add')

    expect(access).to.equal(null)

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/', '*', true)

    access = await accessControl.getAccess('https://ipfs.io/', 'files.add')

    const expectedAccess = { scope: 'https://ipfs.io/', permissions: ['files.add'], allow: true }

    expect(access).to.deep.equal(expectedAccess)
  })

  it('should allow access for wildcard allow with deeper scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access = await accessControl.getAccess('https://ipfs.io/docs/install/', 'files.add')

    expect(access).to.equal(null)

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/', '*', true)

    access = await accessControl.getAccess('https://ipfs.io/docs/install/', 'files.add')

    const expectedAccess = { scope: 'https://ipfs.io/', permissions: ['files.add'], allow: true }

    expect(access).to.deep.equal(expectedAccess)
  })

  it('should not have access for wildcard allow with shallower scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access = await accessControl.getAccess('https://ipfs.io/docs/', 'files.add')

    expect(access).to.equal(null)

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/docs/install/', '*', true)

    access = await accessControl.getAccess('https://ipfs.io/docs/', 'files.add')

    expect(access).to.equal(null)
  })

  it('should deny access for wildcard deny', async () => {
    const accessControl = new AccessControl(new Storage())
    let access = await accessControl.getAccess('https://ipfs.io/', 'files.add')

    expect(access).to.equal(null)

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/', '*', false)

    access = await accessControl.getAccess('https://ipfs.io/', 'files.add')

    const expectedAccess = { scope: 'https://ipfs.io/', permissions: ['files.add'], allow: false }

    expect(access).to.deep.equal(expectedAccess)
  })

  it('should clear existing grants when setting wildcard access', async () => {
    const accessControl = new AccessControl(new Storage())

    await accessControl.setAccess('https://ipfs.io/', 'files.add', false)
    await accessControl.setAccess('https://ipfs.io/', 'object.new', true)
    await accessControl.setAccess('https://ipfs.io/', 'config.set', false)

    let acl = await accessControl.getAcl()

    let expectedAcl = objToAcl({
      'https://ipfs.io/': {
        'files.add': false,
        'object.new': true,
        'config.set': false
      }
    })

    expect(acl).to.deep.equal(expectedAcl)

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/', '*', false)

    acl = await accessControl.getAcl()

    expectedAcl = objToAcl({
      'https://ipfs.io/': {
        '*': false
      }
    })

    expect(acl).to.deep.equal(expectedAcl)
  })

  it('should not be able to set different access to specific permission if wildcard access grant exists', async () => {
    const accessControl = new AccessControl(new Storage())

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/', '*', false)

    let error

    try {
      await accessControl.setAccess('https://ipfs.io/', 'files.add', true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Illegal set access for \'files.add\' when wildcard exists')
  })

  it('should be able set same access to specific permission if wildcard access grant exists', async () => {
    const accessControl = new AccessControl(new Storage())

    // Add wildcard
    await accessControl.setAccess('https://ipfs.io/', '*', false)

    let error

    try {
      await accessControl.setAccess('https://ipfs.io/', 'files.add', false)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.not.throw()
  })

  it('should get granted access for scope and permission', async () => {
    const accessControl = new AccessControl(new Storage())

    let access = await accessControl.setAccess('http://ipfs.io/', 'ipfs.files.add', true)
    const expectedAccess = { scope: 'http://ipfs.io/', permissions: ['ipfs.files.add'], allow: true }

    expect(access).to.deep.equal(expectedAccess)

    access = await accessControl.getAccess('http://ipfs.io/', 'ipfs.files.add')

    expect(access).to.deep.equal(expectedAccess)
  })

  it('should not get access if scope is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.getAccess(null, 'ipfs.files.add')
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid scope')
  })

  it('should not get access if permission is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.getAccess('http://ipfs.io/', 138)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid permission')
  })

  it('should return null for missing grant', async () => {
    const accessControl = new AccessControl(new Storage())
    const access = await accessControl.getAccess('http://ipfs.io/', 'ipfs.files.add')

    expect(access).to.equal(null)
  })

  it('should not set access if scope is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.setAccess('NOT A VALID SCOPE', 'ipfs.files.add', true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid scope')

    try {
      await accessControl.setAccess(138, 'ipfs.files.add', true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid scope')
  })

  it('should not set access if permission is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.setAccess('http://ipfs.io/', 138, true)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid permission')
  })

  it('should not set access if allow is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.setAccess('http://ipfs.io/', 'ipfs.files.add', 'true')
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
          'http://ipfs.io/': {
            'ipfs.files.add': false
          }
        }))
        resolve()
      })

      accessControl.setAccess('http://ipfs.io/', 'ipfs.files.add', false)
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

    await accessControl.setAccess('http://ipfs.io/', 'ipfs.files.add', false)
    let access = await accessControl.getAccess('http://ipfs.io/', 'ipfs.files.add')

    expect(access).to.deep.equal({ scope: 'http://ipfs.io/', permissions: ['ipfs.files.add'], allow: false })

    await accessControl.revokeAccess('http://ipfs.io/', 'ipfs.files.add')

    access = await accessControl.getAccess('http://ipfs.io/', 'ipfs.files.add')

    expect(access).to.equal(null)
  })

  it('should revoke all granted access if no permission specified', async () => {
    const accessControl = new AccessControl(new Storage())

    await accessControl.setAccess('http://ipfs.io/', 'ipfs.files.add', false)
    await accessControl.setAccess('http://ipfs.io/', 'ipfs.block.put', false)

    let acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(objToAcl({
      'http://ipfs.io/': {
        'ipfs.files.add': false,
        'ipfs.block.put': false
      }
    }))

    await accessControl.revokeAccess('http://ipfs.io/')

    acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(objToAcl({ 'http://ipfs.io/': {} }))
  })

  it('should not revoke access if scope is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.revokeAccess('NOT A VALID SCOPE', 'ipfs.files.add')
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid scope')
  })

  it('should not revoke access if permission is invalid', async () => {
    const accessControl = new AccessControl(new Storage())
    let error

    try {
      await accessControl.revokeAccess('http://ipfs.io/', 138)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('Invalid permission')
  })

  it('should allow to all paths above root scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/', 'files.add', true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(true)
  })

  it('should deny to all paths below root scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/', 'files.add', false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(false)
  })

  it('should allow to paths in scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', 'files.add', true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/other', 'files.add')
    expect(access).to.equal(null)
  })

  it('should deny to paths in scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', 'files.add', false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/other', 'files.add')
    expect(access).to.equal(null)
  })

  it('should allow to paths in scope and no access for paths above scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps/uk', 'files.add', true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/maps/', 'files.add')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/', 'files.add')
    expect(access).to.equal(null)
  })

  it('should deny to paths in scope and no access for paths above scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps/uk', 'files.add', false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/maps/', 'files.add')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/', 'files.add')
    expect(access).to.equal(null)
  })

  it('should shadow allow with deny in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', 'files.add', true)
    await accessControl.setAccess('https://www.google.com/maps/uk', 'files.add', false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(false)
  })

  it('should shadow deny with allow in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', 'files.add', false)
    await accessControl.setAccess('https://www.google.com/maps/uk', 'files.add', true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(true)
  })

  it('should shadow allow with deny wildcard in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', 'files.add', true)
    await accessControl.setAccess('https://www.google.com/maps/uk', '*', false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'object.new')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'object.new')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'object.new')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'object.new')
    expect(access.allow).to.equal(false)
  })

  it('should shadow deny with allow wildcard in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', 'files.add', false)
    await accessControl.setAccess('https://www.google.com/maps/uk', '*', true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'object.new')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'object.new')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'object.new')
    expect(access).to.equal(null)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'object.new')
    expect(access.allow).to.equal(true)
  })

  it('should shadow allow wildcard with deny in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', '*', true)
    await accessControl.setAccess('https://www.google.com/maps/uk', 'files.add', false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'object.new')
    expect(access.allow).to.equal(true)
  })

  it('should shadow deny wildcard with allow in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', '*', false)
    await accessControl.setAccess('https://www.google.com/maps/uk', 'files.add', true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'object.new')
    expect(access.allow).to.equal(false)
  })

  it('should shadow allow wildcard with deny wildcard in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', '*', true)
    await accessControl.setAccess('https://www.google.com/maps/uk', '*', false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'object.new')
    expect(access.allow).to.equal(false)
  })

  it('should shadow deny wildcard with allow wildcard in below scope', async () => {
    const accessControl = new AccessControl(new Storage())
    let access

    await accessControl.setAccess('https://www.google.com/maps', '*', false)
    await accessControl.setAccess('https://www.google.com/maps/uk', '*', true)

    access = await accessControl.getAccess('https://www.google.com/maps', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/mapsearch', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'files.add')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/usa', 'object.new')
    expect(access.allow).to.equal(false)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/ukraine', 'object.new')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'files.add')
    expect(access.allow).to.equal(true)

    access = await accessControl.getAccess('https://www.google.com/maps/uk/london', 'object.new')
    expect(access.allow).to.equal(true)
  })

  it('should destroy itself', () => {
    const accessControl = new AccessControl(new Storage())
    expect(() => accessControl.destroy()).to.not.throw()
  })

  after(() => {
    delete global.URL
  })
})
