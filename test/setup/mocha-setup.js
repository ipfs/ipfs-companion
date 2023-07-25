import AbortController from 'abort-controller'
import { afterEach } from 'mocha'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import DeclarativeNetRequestMock from '../functional/lib/redirect-handler/declarativeNetRequest.mock.js'

if (process.env.TEST_MV3 !== 'true') {
  browser.runtime.id = 'testid'
  global.browser = browser
  global.AbortController = AbortController
  global.chrome = browser
  global.navigator = {
    clipboard: {
      writeText: () => {}
    }
  }
} else {
  browser.runtime.id = 'testid'
  global.browser = browser
  global.AbortController = AbortController
  global.chrome = browser
  global.navigator = {
    clipboard: {
      writeText: () => {}
    }
  }
  const sinonSandbox = sinon.createSandbox()
  global.browser.declarativeNetRequest = sinonSandbox.spy(new DeclarativeNetRequestMock())

  afterEach(function () {
    sinonSandbox.resetHistory()
  })
}
