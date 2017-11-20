const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
const { URL } = require('url')
const { optionDefaults } = require('../../../add-on/src/lib/options')

describe('init', () => {
  let init

  before(() => {
    global.window = {}
    global.browser = browser
    global.URL = URL
    init = require('../../../add-on/src/lib/ipfs-companion')
  })

  beforeEach(() => {
    browser.flush()
  })

  it('should query local storage for options with hardcoded defaults for fallback', async () => {
    browser.storage.local.get.returns(Promise.resolve(optionDefaults))
    browser.storage.local.set.returns(Promise.resolve())
    await init()
    browser.storage.local.get.calledWith(optionDefaults)
    init.destroy()
  })

  after(() => {
    delete global.window
    delete global.browser
    delete global.URL
    browser.flush()
  })
})

describe.skip('onStorageChange()', function () {
  let init

  before(() => {
    global.window = {}
    global.browser = browser
    global.URL = URL
    init = require('../../../add-on/src/lib/ipfs-companion')
  })

  beforeEach(() => {
    browser.flush()
  })

  it('should update ipfs API instance on IPFS API URL change', async () => {
    browser.storage.local.get.returns(Promise.resolve(optionDefaults))
    browser.storage.local.set.returns(Promise.resolve())
    browser.browserAction.setBadgeBackgroundColor.returns(Promise.resolve())
    browser.browserAction.setBadgeText.returns(Promise.resolve())
    browser.browserAction.setIcon.returns(Promise.resolve())
    browser.tabs.query.returns(Promise.resolve([{ id: 'TEST' }]))
    browser.contextMenus.update.returns(Promise.resolve())
    browser.idle.queryState.returns(Promise.resolve('active'))

    await init()

    const oldIpfsApiUrl = 'http://127.0.0.1:5001'
    const newIpfsApiUrl = 'http://1.2.3.4:8080'
    const changes = {ipfsApiUrl: {oldValue: oldIpfsApiUrl, newValue: newIpfsApiUrl}}
    const area = 'local'
    const ipfs = global.window.ipfs
    browser.storage.onChanged.dispatch(changes, area)
    expect(ipfs).to.not.equal(window.ipfs)
    init.destroy()
  })

  after(() => {
    delete global.window
    delete global.browser
    delete global.URL
    browser.flush()
  })
})
