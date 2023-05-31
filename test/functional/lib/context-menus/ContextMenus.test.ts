import { ContextMenus } from '../../../../add-on/src/lib/context-menus/ContextMenus'
import {expect} from 'chai'
import { before, describe, it } from 'mocha'
import browserMock from 'sinon-chrome'
import sinon from 'sinon'

describe('lib/context-menus/ContextMenus', () => {
  let sinonSandbox

  before(function () {
    browserMock.runtime.id = 'testid'
    sinonSandbox = sinon.createSandbox()
  })

  beforeEach(function () {
    sinonSandbox.restore()
    browserMock.contextMenus.onClicked.addListener.resetHistory()
  })

  it('initializes and registers global listener', () => {
    const contextMenus = new ContextMenus()
    expect(contextMenus).to.be.an.instanceOf(ContextMenus)
    expect(contextMenus).to.have.property('contextMenuListeners')
    expect(contextMenus).to.have.property('log')
    expect(contextMenus).to.have.property('init')
    expect(contextMenus).to.have.property('queueListener')
    expect(contextMenus).to.have.property('create')
    expect(browserMock.contextMenus.onClicked.addListener.called).to.be.true
  })

  it('queues listener and calls that when event is fired.', () => {
    const contextMenus = new ContextMenus()
    const globalListener = browserMock.contextMenus.onClicked.addListener.firstCall.args[0]
    const listenerSpy = sinonSandbox.spy()
    contextMenus.queueListener('testIdOne', listenerSpy)
    // emulate event
    globalListener({ menuItemId: 'testIdOne' })
    expect(listenerSpy.called).to.be.true
  })

  it('should allow adding listener to existing menuItemId', () => {
    const contextMenus = new ContextMenus()
    const globalListener = browserMock.contextMenus.onClicked.addListener.firstCall.args[0]
    const listenerSpyOne = sinonSandbox.spy()
    const listenerSpyTwo = sinonSandbox.spy()
    contextMenus.queueListener('testIdOne', listenerSpyOne)
    contextMenus.queueListener('testIdOne', listenerSpyTwo)
    // emulate event
    globalListener({ menuItemId: 'testIdOne' })
    expect(listenerSpyOne.called).to.be.true
    expect(listenerSpyTwo.called).to.be.true
  })

  it('should allow adding listener on the fly', () => {
    const contextMenus = new ContextMenus()
    const globalListener = browserMock.contextMenus.onClicked.addListener.firstCall.args[0]
    const listenerSpyOne = sinonSandbox.spy()
    const listenerSpyTwo = sinonSandbox.spy()
    contextMenus.queueListener('testIdOne', listenerSpyOne)
    contextMenus.queueListener('testIdTwo', listenerSpyTwo)
    // emulate event
    globalListener({ menuItemId: 'testIdOne' })
    expect(listenerSpyOne.called).to.be.true
    globalListener({ menuItemId: 'testIdTwo' })
    expect(listenerSpyTwo.called).to.be.true
  })

  it('should create and queue listener', () => {
    const contextMenus = new ContextMenus()
    const globalListener = browserMock.contextMenus.onClicked.addListener.firstCall.args[0]
    const listenerSpy = sinonSandbox.spy()
    contextMenus.create({ id: 'testIdOne' }, listenerSpy)
    // emulate event
    globalListener({ menuItemId: 'testIdOne' })
    expect(listenerSpy.called).to.be.true
  })

  it('should create and queue multiple listeners for same menuItemId', () => {
    const contextMenus = new ContextMenus()
    const globalListener = browserMock.contextMenus.onClicked.addListener.firstCall.args[0]
    const listenerSpyOne = sinonSandbox.spy()
    const listenerSpyTwo = sinonSandbox.spy()
    contextMenus.create({ id: 'testIdOne' }, listenerSpyOne)
    contextMenus.create({ id: 'testIdOne' }, listenerSpyTwo)
    // emulate event
    globalListener({ menuItemId: 'testIdOne' })
    expect(listenerSpyOne.called).to.be.true
    expect(listenerSpyTwo.called).to.be.true
  })

  it('should create and queue listener for multiple items', () => {
    const contextMenus = new ContextMenus()
    const globalListener = browserMock.contextMenus.onClicked.addListener.firstCall.args[0]
    const listenerSpyOne = sinonSandbox.spy()
    const listenerSpyTwo = sinonSandbox.spy()
    contextMenus.create({ id: 'testIdOne' }, listenerSpyOne)
    contextMenus.create({ id: 'testIdTwo' }, listenerSpyTwo)
    // emulate event
    globalListener({ menuItemId: 'testIdOne' })
    expect(listenerSpyOne.called).to.be.true
    globalListener({ menuItemId: 'testIdTwo' })
    expect(listenerSpyTwo.called).to.be.true
  })

  it('should throw error if id is not provided and callback is', () => {
    const contextMenus = new ContextMenus()
    expect(() => contextMenus.create({ }, () => {})).to.throw()
  })
})
