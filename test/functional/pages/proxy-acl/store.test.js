'use strict'
const { describe, it } = require('mocha')
const { expect } = require('chai')
const Storage = require('mem-storage-area/Storage')
const EventEmitter = require('events')
const sinon = require('sinon')
const AccessControl = require('../../../../add-on/src/lib/ipfs-proxy/access-control')
const createProxyAclStore = require('../../../../add-on/src/pages/proxy-acl/store')

describe('pages/proxy-acl/store', () => {
  it('should emit render when DOM is ready', async () => {
    const accessControl = new AccessControl(new Storage())
    const i18n = createMockI18n()
    const confirm = createMockConfirm()
    const store = createProxyAclStore(accessControl, i18n, confirm)
    const emitter = new EventEmitter()
    const state = {}

    store(state, emitter)

    sinon.stub(emitter, 'emit')

    await new Promise(resolve => {
      // When emit('render') is called, pass the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      emitter.emit('DOMContentLoaded')
    })
  })

  it('should initialise state with ACL', async () => {
    const accessControl = new AccessControl(new Storage())
    const i18n = createMockI18n()
    const confirm = createMockConfirm()
    const store = createProxyAclStore(accessControl, i18n, confirm)
    const emitter = new EventEmitter()
    const state = {}

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', true)

    store(state, emitter)

    sinon.stub(emitter, 'emit')

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      emitter.emit('DOMContentLoaded')
    })

    const acl = await accessControl.getAcl()

    const expectedAcl = {
      'http://ipfs.io': {
        'ipfs.files.add': true
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)
  })

  it('should revoke access on revoke event', async () => {
    const accessControl = new AccessControl(new Storage())
    const i18n = createMockI18n()
    const confirm = createMockConfirm(true)
    const store = createProxyAclStore(accessControl, i18n, confirm)
    const emitter = new EventEmitter()
    const state = {}

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', true)
    await accessControl.setAccess('http://ipfs.io', 'ipfs.block.new', false)

    store(state, emitter)

    sinon.stub(emitter, 'emit')

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      emitter.emit('DOMContentLoaded')
    })

    let acl = await accessControl.getAcl()

    let expectedAcl = {
      'http://ipfs.io': {
        'ipfs.files.add': true,
        'ipfs.block.new': false
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)

    emitter.emit.reset()

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      // Now revoke this grant
      const e = createMockEvent({ 'data-origin': 'http://ipfs.io', 'data-permission': 'ipfs.files.add' })
      emitter.emit('revoke', e)
    })

    acl = await accessControl.getAcl()

    expectedAcl = {
      'http://ipfs.io': {
        'ipfs.block.new': false
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)
  })

  it('should revoke all access on revoke event with no specific permission', async () => {
    const accessControl = new AccessControl(new Storage())
    const i18n = createMockI18n()
    const confirm = createMockConfirm(true)
    const store = createProxyAclStore(accessControl, i18n, confirm)
    const emitter = new EventEmitter()
    const state = {}

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    await accessControl.setAccess('http://ipfs.io', 'ipfs.block.new', false)

    store(state, emitter)

    sinon.stub(emitter, 'emit')

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      emitter.emit('DOMContentLoaded')
    })

    let acl = await accessControl.getAcl()

    let expectedAcl = {
      'http://ipfs.io': {
        'ipfs.files.add': false,
        'ipfs.block.new': false
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)

    emitter.emit.reset()

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      // Now revoke all grants
      const e = createMockEvent({ 'data-origin': 'http://ipfs.io' })
      emitter.emit('revoke', e)
    })

    acl = await accessControl.getAcl()

    expectedAcl = {
      'http://ipfs.io': {}
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)
  })

  it('should not revoke if not confirmed', async () => {
    const accessControl = new AccessControl(new Storage())
    const i18n = createMockI18n()
    const confirm = createMockConfirm(false)
    const store = createProxyAclStore(accessControl, i18n, confirm)
    const emitter = new EventEmitter()
    const state = {}

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    await accessControl.setAccess('http://ipfs.io', 'ipfs.block.new', false)

    store(state, emitter)

    sinon.stub(emitter, 'emit')

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      emitter.emit('DOMContentLoaded')
    })

    let acl = await accessControl.getAcl()

    const expectedAcl = {
      'http://ipfs.io': {
        'ipfs.files.add': false,
        'ipfs.block.new': false
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)

    emitter.emit.reset()
    emitter.emit.callThrough()

    // Now attempt revoke all grants
    const e = createMockEvent({ 'data-origin': 'http://ipfs.io' })
    emitter.emit('revoke', e)

    acl = await accessControl.getAcl()

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)
  })

  it('should change access right', async () => {
    const accessControl = new AccessControl(new Storage())
    const i18n = createMockI18n()
    const confirm = createMockConfirm(true)
    const store = createProxyAclStore(accessControl, i18n, confirm)
    const emitter = new EventEmitter()
    const state = {}

    await accessControl.setAccess('http://ipfs.io', 'ipfs.files.add', false)
    await accessControl.setAccess('http://ipfs.io', 'ipfs.block.new', false)

    store(state, emitter)

    sinon.stub(emitter, 'emit')

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      emitter.emit('DOMContentLoaded')
    })

    let acl = await accessControl.getAcl()

    let expectedAcl = {
      'http://ipfs.io': {
        'ipfs.files.add': false,
        'ipfs.block.new': false
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)

    emitter.emit.reset()

    await new Promise(resolve => {
      // When emit('render') is called, continue the test
      emitter.emit.withArgs('render').callsFake(() => resolve())

      // For other calls, call the real function
      emitter.emit.callThrough()

      // Now toggle the access right
      const e = createMockEvent({ 'data-origin': 'http://ipfs.io', 'data-permission': 'ipfs.files.add', 'data-allow': 'false' })
      emitter.emit('toggleAllow', e)
    })

    acl = await accessControl.getAcl()

    expectedAcl = {
      'http://ipfs.io': {
        'ipfs.files.add': true,
        'ipfs.block.new': false
      }
    }

    expect(acl).to.deep.equal(expectedAcl)
    expect(state.acl).to.deep.equal(expectedAcl)
  })
})

const createMockI18n = () => ({ getMessage: key => key })

const createMockConfirm = (res = true) => () => res

const createMockEvent = (targetAttributes = {}) => {
  return { currentTarget: { getAttribute: (name) => targetAttributes[name] } }
}
