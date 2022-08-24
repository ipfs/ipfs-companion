'use strict'
const { describe, it, before, beforeEach } = require('mocha')
const browser = require('sinon-chrome')
const sinon = require('sinon')

const CUSTOM_GATEWAY_URL = {
  customGatewayUrl: 'http://127.0.0.1:8080'
}

const logger = sinon.spy()

// Units to be tested.
const {
  prepareReloadExtensions,
  InternalTabReloader,
  LocalGatewayReloader,
  WebUiReloader
} = require('../../../../../add-on/src/lib/ipfs-client/reloaders')

describe('Reloader Helper Method: prepareReloadExtensions', function () {
  it('Prepares the reloader extensions', async function () {
    browser.storage.local.get.resolves(CUSTOM_GATEWAY_URL)
    browser.runtime.getURL.returns('chrome-extension://<some_id>')
    await prepareReloadExtensions([WebUiReloader, InternalTabReloader, LocalGatewayReloader], browser, logger)
    sinon.assert.callCount(logger, 3)
  })
})

describe('Reloaders', function () {
  before(() => {
    global.browser = browser
    global.chrome = {}
  })

  beforeEach(function () {
    browser.flush()
    logger.resetHistory()
  })

  describe('WebUiReloader', function () {
    let webUiReloader
    beforeEach(async function () {
      webUiReloader = new WebUiReloader(browser, logger)
      await webUiReloader.init()
    })

    it('should initialize', function () {
      sinon.assert.calledWith(logger, 'Initialized without additional config.')
    })

    it('should handle webUi reloading', function () {
      const tabs = [{
        url: 'http://some-url.com',
        id: 1
      }, {
        url: 'ipfs://some-ipfs-server.tld/webui/index.html#/',
        id: 2
      }]

      webUiReloader.reload(tabs)
      sinon.assert.calledWith(browser.tabs.reload, 2)
      sinon.assert.calledWith(logger, 'reloading webui at ipfs://some-ipfs-server.tld/webui/index.html#/')
    })
  })

  describe('InternalTabReloader', function () {
    let internalTabReloader
    beforeEach(async function () {
      browser.runtime.getURL.returns('chrome-extension://<some_id>')
      internalTabReloader = new InternalTabReloader(browser, logger)
      await internalTabReloader.init()
    })

    it('should initialize', function () {
      sinon.assert.calledWith(logger, 'InternalTabReloader Ready for use.')
    })

    it('should handle internal tab reloading', function () {
      const tabs = [{
        url: 'http://127.0.0.1:8080/ipfs/cid/wiki1',
        id: 1
      }, {
        url: 'chrome-extension://<some_id>/index.html',
        id: 2
      }]

      internalTabReloader.reload(tabs)
      sinon.assert.calledWith(browser.tabs.reload, 2)
      sinon.assert.calledWith(logger, 'reloading internal extension page at chrome-extension://<some_id>/index.html')
    })
  })

  describe('LocalGatewayReloader', function () {
    let localGatewayReloader
    beforeEach(async function () {
      browser.storage.local.get.resolves(CUSTOM_GATEWAY_URL)
      localGatewayReloader = new LocalGatewayReloader(browser, logger)
      await localGatewayReloader.init()
    })

    it('should initialize', function () {
      sinon.assert.calledWith(logger, 'LocalGatewayReloader Ready for use.')
    })

    it('should handle local gateway tab reloading', function () {
      const tabs = [{
        title: 'Main Page',
        url: 'http://127.0.0.1:8080/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki1',
        id: 1
      }, {
        title: '127.0.0.1:8080',
        url: 'http://127.0.0.1:8080/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki2',
        id: 2
      }]

      localGatewayReloader.reload(tabs)
      sinon.assert.calledWith(browser.tabs.reload, 2)
      sinon.assert.calledWith(logger, 'reloading local gateway at http://127.0.0.1:8080/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki2')
    })
  })
})
