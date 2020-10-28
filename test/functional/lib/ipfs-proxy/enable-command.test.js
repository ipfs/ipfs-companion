'use strict'
/* eslint-env browser, webextensions */

const browser = require('sinon-chrome')
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const { URL } = require('url')
const Storage = require('mem-storage-area/Storage')
const Sinon = require('sinon')
const AccessControl = require('../../../../add-on/src/lib/ipfs-proxy/access-control')
const createEnableCommand = require('../../../../add-on/src/lib/ipfs-proxy/enable-command')
const createRequestAccess = require('../../../../add-on/src/lib/ipfs-proxy/request-access')
const { initState } = require('../../../../add-on/src/lib/state')
const { optionDefaults } = require('../../../../add-on/src/lib/options')

describe('lib/ipfs-proxy/enable-command', () => {
  before(() => {
    global.URL = URL
    global.browser = browser
    global.screen = global.screen || { width: 1024, height: 720 }
  })

  it('should throw if proxy access is disabled globally', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: false })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://1.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = createRequestAccess(browser, screen)
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['files.mkdir', 'id', 'version'] }

    let error

    try {
      await enable(permissions)
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
    const getScope = () => 'https://1.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = createRequestAccess(browser, screen)
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['files.mkdir', 'id', 'version'] }

    let error

    try {
      await enable(permissions)
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw('User disabled access to API proxy in IPFS Companion')
    expect(error.scope).to.equal(undefined)
    expect(error.permissions).to.be.equal(undefined)
  })

  it('should throw if access to unknown command is requested', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://2.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = createRequestAccess(browser, screen)
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)

    let error

    try {
      await enable({ commands: ['id', 'FAKECOMMAND'] })
    } catch (err) {
      error = err
    }

    expect(() => { if (error) throw error }).to.throw("Access to 'FAKECOMMAND' commands over IPFS Proxy is globally blocked")
  })

  it('should return without prompt if called without any arguments', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://3.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => { throw new Error('THIS SHOULD NOT HAPPEN ;-)') })
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)

    // get IPFS API instance
    await enable()
    // confirm there was no user prompt
    expect(requestAccess.called).to.equal(false)
  })

  it('should request access if no grant exists', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://4.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: true }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    await enable(permissions)

    expect(requestAccess.called).to.equal(true)
    const { allow } = await accessControl.getAccess(getScope(), 'version')
    expect(allow).to.equal(true)
  })

  it('should request access if partial grant exists', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://4.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: true }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    // ensure partial grant exists
    await accessControl.setAccess(getScope(), 'id', true)
    const idAcl = await accessControl.getAccess(getScope(), 'id')
    expect(idAcl.allow).to.equal(true)

    await enable(permissions)

    expect(requestAccess.called).to.equal(true)
    const versionAcl = await accessControl.getAccess(getScope(), 'version')
    expect(versionAcl.allow).to.equal(true)
  })

  it('should deny access if any partial deny already exists', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://4.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: true }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    // ensure partial deny exists
    await accessControl.setAccess(getScope(), 'id', false)
    const idAcl = await accessControl.getAccess(getScope(), 'id')
    expect(idAcl.allow).to.equal(false)

    // main test
    let error
    try {
      await enable(permissions)
    } catch (err) {
      error = err
    }

    // confirm build permission request failed with error
    expect(requestAccess.called).to.equal(false)
    expect(() => { if (error) throw error }).to.throw('User denied access to selected commands over IPFS proxy: id')

    // ensure explicit version acl is still missing
    const versionAcl = await accessControl.getAccess(getScope(), 'version')
    expect(versionAcl).to.equal(null)
  })

  it('should deny access when user denies request', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://5.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: false }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    let error

    try {
      await enable(permissions)
    } catch (err) {
      error = err
    }

    expect(requestAccess.called).to.equal(true)
    expect(() => { if (error) throw error }).to.throw(`User denied access to selected commands over IPFS proxy: ${permissions.commands}`)
  })

  it('should not re-request if denied', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://6.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: false }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    let error

    try {
      await enable(permissions)
    } catch (err) {
      error = err
    }

    expect(requestAccess.called).to.equal(true)
    expect(() => { if (error) throw error }).to.throw(`User denied access to selected commands over IPFS proxy: ${permissions.commands}`)

    error = null
    requestAccess.resetHistory()

    try {
      await enable(permissions)
    } catch (err) {
      error = err
    }

    expect(requestAccess.called).to.equal(false)
    expect(() => { if (error) throw error }).to.throw(`User denied access to selected commands over IPFS proxy: ${permissions.commands}`)
  })

  it('should have a well-formed Error if denied', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://7.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: false }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    let error

    try {
      await enable(permissions)
    } catch (err) {
      error = err
    }

    expect(error.output.payload).to.deep.eql({
      code: 'ERR_IPFS_PROXY_ACCESS_DENIED',
      permissions: permissions.commands,
      scope: getScope(),
      isIpfsProxyAclError: true, // deprecated
      permission: permissions.commands[0] // deprecated

    })
  })

  it('should not re-request if allowed', async () => {
    const getState = () => initState(optionDefaults, { ipfsProxy: true })
    const accessControl = new AccessControl(new Storage())
    const getScope = () => 'https://8.foo.tld/path/'
    const getIpfs = () => {}
    const requestAccess = Sinon.spy(async () => ({ allow: true }))
    const enable = createEnableCommand(getIpfs, getState, getScope, accessControl, requestAccess)
    const permissions = { commands: ['id', 'version'] }

    await enable(permissions)
    expect(requestAccess.callCount).to.equal(1)

    await enable(permissions)
    expect(requestAccess.callCount).to.equal(1)
  })

  after(() => {
    delete global.URL
  })
})
