const { describe, it, before, beforeEach, after } = require('mocha')
const { expect } = require('chai')
const browser = require('sinon-chrome')
const { URL } = require('url')
const { optionDefaults } = require('../../../add-on/src/lib/options')
const { AbortController } = require('abort-controller')

describe('lib/ipfs-companion.js', function () {
  describe('init', function () {
    let init

    before(function () {
      global.localStorage = global.localStorage || {}
      global.window = { AbortController }
      global.browser = browser
      global.URL = global.URL || URL
      global.screen = { width: 1024, height: 720 }
      browser.runtime.getManifest.returns({ version: '0.0.0' }) // on-installed.js
      init = require('../../../add-on/src/lib/ipfs-companion')
    })

    beforeEach(function () {
      browser.flush()
    })

    it('should query local storage for options with hardcoded defaults for fallback', async function () {
      browser.storage.local.get.returns(Promise.resolve(optionDefaults))
      browser.storage.local.set.returns(Promise.resolve())
      const ipfsCompanion = await init()
      browser.storage.local.get.calledWith(optionDefaults)
      return ipfsCompanion.destroy()
    })

    after(function () {
      browser.flush()
    })
  })

  describe.skip('onStorageChange()', function () {
    let init

    before(function () {
      global.window = {}
      global.browser = browser
      global.URL = URL
      init = require('../../../add-on/src/lib/ipfs-companion')
    })

    beforeEach(function () {
      browser.flush()
    })

    it('should update ipfs API instance on IPFS API URL change', async function () {
      browser.storage.local.get.returns(Promise.resolve(optionDefaults))
      browser.storage.local.set.returns(Promise.resolve())
      browser.browserAction.setBadgeBackgroundColor.returns(Promise.resolve())
      browser.browserAction.setBadgeText.returns(Promise.resolve())
      browser.browserAction.setIcon.returns(Promise.resolve())
      browser.tabs.query.returns(Promise.resolve([{ id: 'TEST' }]))
      browser.contextMenus.update.returns(Promise.resolve())
      browser.idle.queryState.returns(Promise.resolve('active'))

      const ipfsCompanion = await init()

      const oldIpfsApiUrl = 'http://127.0.0.1:5001'
      const newIpfsApiUrl = 'http://1.2.3.4:8080'
      const changes = { ipfsApiUrl: { oldValue: oldIpfsApiUrl, newValue: newIpfsApiUrl } }
      const area = 'local'
      const ipfs = global.window.ipfs
      browser.storage.onChanged.dispatch(changes, area)
      expect(ipfs).to.not.equal(window.ipfs)
      return ipfsCompanion.destroy()
    })

    after(function () {
      browser.flush()
    })
  })
})
