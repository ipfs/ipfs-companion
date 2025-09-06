import AbortController from 'abort-controller'
import { afterEach, beforeEach } from 'mocha'
import sinon, { useFakeTimers } from 'sinon'
import browser from 'sinon-chrome'
import DeclarativeNetRequestMock from '../functional/lib/redirect-handler/declarativeNetRequest.mock.js'
import isManifestV3 from '../helpers/is-mv3-testing-enabled.js'

browser.runtime.id = 'testid'
global.browser = browser
global.AbortController = AbortController
global.chrome = browser

// Mock navigator.clipboard for tests (required for Node.js 20+)
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: () => {}
    }
  },
  writable: true,
  configurable: true
})

global.URL = URL
browser.tabs = { ...browser.tabs, getCurrent: sinon.stub().resolves({ id: 20 }) }

// need to force Date to return a particular date
global.clock = useFakeTimers({
  now: new Date(2017, 10, 5, 12, 1, 1)
})

if (isManifestV3) {
  const sinonSandbox = sinon.createSandbox()
  beforeEach(function () {
    browser.runtime.getURL.returns('chrome-extension://testid/')
    browser.tabs = {
      ...browser.tabs,
      getCurrent: sinonSandbox.stub().resolves({ id: 20 }),
      query: sinonSandbox.stub().resolves([{ id: 40 }]),
      update: sinonSandbox.stub().resolves()
    }
    browser.declarativeNetRequest = sinonSandbox.spy(new DeclarativeNetRequestMock())
  })

  afterEach(function () {
    sinonSandbox.resetHistory()
  })
} else {
  beforeEach(function () {
    browser.runtime.getURL.returns('chrome-extension://testid/')
  })
}
