import { expect } from 'chai'
import { after, before, describe, it } from 'mocha'
import browser from 'sinon-chrome'
import { URL } from 'url'
import { optionDefaults } from '../../../add-on/src/lib/options.js'

// We need to do this because global is not mapped otherwise, we need to stub browser and chrome runtime
// so that the webextension-polyfill does not complain about the test runner not being a browser instance.
const init = async () => (await import('../../../add-on/src/lib/ipfs-companion.js')).default()

describe('lib/ipfs-companion.js', function () {
  describe('init', function () {
    before(function () {
      global.localStorage = global.localStorage || {}
      global.URL = global.URL || URL
      global.screen = { width: 1024, height: 720 }
      global.addEventListener = () => { }
      global.location = { hostname: 'test' }

      browser.runtime.getManifest.returns({ version: '0.0.0' }) // on-installed.js
    })

    it('should query local storage for options with hardcoded defaults for fallback', async function () {
      this.timeout(10000)
      browser.storage.local.get.resolves(optionDefaults)
      browser.storage.local.set.resolves()
      const ipfsCompanion = await init()
      expect(browser.storage.local.get.calledWith(optionDefaults)).to.equal(true)
      return await ipfsCompanion.destroy()
    })

    after(function () {
      browser.flush()
    })
  })

  describe.skip('onStorageChange()', function () {
    it('should update ipfs API instance on IPFS API URL change', async function () {
      browser.storage.local.get.resolves(optionDefaults)
      browser.storage.local.set.resolves()
      browser.action.setBadgeBackgroundColor.resolves()
      browser.action.setBadgeText.resolves()
      browser.action.setIcon.resolves()
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
