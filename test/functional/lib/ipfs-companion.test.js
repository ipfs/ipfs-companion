import { describe, it, before, after } from 'mocha'
import { expect } from 'chai'
import browser from 'sinon-chrome'
import AbortController from 'abort-controller'
import { URL } from 'url'
import { optionDefaults } from '../../../add-on/src/lib/options.js'
browser.runtime.id = 'testid'
global.browser = browser
global.AbortController = AbortController
global.chrome = browser
global.navigator = {
  clipboard: {
    writeText: () => {}
  }
}
// We need to do this because global is not mapped otherwise, we need to stub browser and chrome runtime
// so that the webextension-polyfill does not complain about the test runner not being a browser instance.
const init = async () => (await import('../../../add-on/src/lib/ipfs-companion.js')).default()

describe('lib/ipfs-companion.js', function () {
  describe('init', function () {
    before(function () {
      global.localStorage = global.localStorage || {}
      global.URL = global.URL || URL
      global.screen = { width: 1024, height: 720 }

      browser.runtime.getManifest.returns({ version: '0.0.0' }) // on-installed.js
    })

    it('should query local storage for options with hardcoded defaults for fallback', async function () {
      this.timeout(10000)
      browser.storage.local.get.resolves(optionDefaults)
      browser.storage.local.set.resolves()
      const ipfsCompanion = await init()
      expect(browser.storage.local.get.calledWith(optionDefaults)).to.equal(true)
      return ipfsCompanion.destroy()
    })

    after(function () {
      browser.flush()
    })
  })

  describe.skip('onStorageChange()', function () {
    before(function () {
      global.window = {}
      global.browser = browser
      global.URL = URL
    })

    it('should update ipfs API instance on IPFS API URL change', async function () {
      browser.storage.local.get.resolves(optionDefaults)
      browser.storage.local.set.resolves()
      browser.browserAction.setBadgeBackgroundColor.resolves()
      browser.browserAction.setBadgeText.resolves()
      browser.browserAction.setIcon.resolves()
      browser.tabs.query.resolves([{ id: 'TEST' }])
      browser.contextMenus.update.resolves()
      browser.idle.queryState.resolves('active')

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
