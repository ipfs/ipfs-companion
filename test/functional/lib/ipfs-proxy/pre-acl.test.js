'use strict'
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const Storage = require('mem-storage-area/Storage')
const Sinon = require('sinon')
const AccessControl = require('../../../../add-on/src/lib/ipfs-proxy/access-control')
const { createPreAcl } = require('../../../../add-on/src/lib/ipfs-proxy/pre-acl')
const { initState } = require('../../../../add-on/src/lib/state')
const { optionDefaults } = require('../../../../add-on/src/lib/options')

describe('lib/ipfs-proxy/pre-acl', () => {
  before(() => {
    global.URL = URL
  })

  it('should throw if access is disabled', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: false })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://ipfs.io/'
    const permission = 'files.add'

    const preAcl = createPreAcl(permission, getState, getScope, accessControl)

    let error

    try {
      await preAcl()
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('User disabled access to API proxy in IPFS Companion')
    expect(error.scope).to.equal(undefined)
    expect(error.permissions).to.be.equal(undefined)
  })

  it('should throw if ALL IPFS integrations are disabled for requested scope', async () => {
    const getState = () => initState(optionDefaults, {
      ipfsProxy: true,
      disabledOn: ['foo.tld']
    })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://2.foo.tld/bar/buzz/'
    const permission = 'files.add'

    const preAcl = createPreAcl(permission, getState, getScope, accessControl)

    let error

    try {
      await preAcl()
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('User disabled access to API proxy in IPFS Companion')
    expect(error.scope).to.equal(undefined)
    expect(error.permissions).to.be.equal(undefined)
  })

  it('should request access if no grant exists', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://ipfs.io/'
    const permission = 'files.add'
    const requestAccess = Sinon.spy(async () => ({ allow: true }))
    const preAcl = createPreAcl(permission, getState, getScope, accessControl, requestAccess)

    await preAcl()

    expect(requestAccess.called).to.equal(true)
  })

  it('should deny access when user denies request', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://ipfs.io/'
    const permission = 'files.add'
    const requestAccess = Sinon.spy(async () => ({ allow: false }))
    const preAcl = createPreAcl(permission, getState, getScope, accessControl, requestAccess)

    let error

    try {
      await preAcl()
    } catch (err) {
      error = err
    }

    expect(requestAccess.called).to.equal(true)
    expect(() => { if (error) throw error }).to.throw(`User denied access to selected commands over IPFS proxy: ${permission}`)
  })

  it('should not re-request if denied', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://ipfs.io/'
    const permission = 'files.add'
    const requestAccess = Sinon.spy(async () => ({ allow: false }))
    const preAcl = createPreAcl(permission, getState, getScope, accessControl, requestAccess)

    let error

    try {
      await preAcl()
    } catch (err) {
      error = err
    }

    expect(requestAccess.called).to.equal(true)
    expect(() => { if (error) throw error }).to.throw(`User denied access to selected commands over IPFS proxy: ${permission}`)

    error = null
    requestAccess.resetHistory()

    try {
      await preAcl()
    } catch (err) {
      error = err
    }

    expect(requestAccess.called).to.equal(false)
    expect(() => { if (error) throw error }).to.throw(`User denied access to selected commands over IPFS proxy: ${permission}`)
  })

  it('should have a well-formed Error if denied', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://ipfs.io/'
    const permission = 'files.add'
    const requestAccess = Sinon.spy(async () => ({ allow: false }))
    const preAcl = createPreAcl(permission, getState, getScope, accessControl, requestAccess)

    let error

    try {
      await preAcl()
    } catch (err) {
      error = err
    }

    expect(error.output.payload).to.deep.eql({
      code: 'ERR_IPFS_PROXY_ACCESS_DENIED',
      permissions: [permission],
      scope: getScope(),
      isIpfsProxyAclError: true, // deprecated
      permission // deprecated
    })
  })

  it('should not re-request if allowed', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://ipfs.io/'
    const permission = 'files.add'
    const requestAccess = Sinon.spy(async () => ({ allow: true }))
    const preAcl = createPreAcl(permission, getState, getScope, accessControl, requestAccess)

    await preAcl()
    expect(requestAccess.callCount).to.equal(1)

    await preAcl()
    expect(requestAccess.callCount).to.equal(1)
  })

  after(() => {
    delete global.URL
  })
})
