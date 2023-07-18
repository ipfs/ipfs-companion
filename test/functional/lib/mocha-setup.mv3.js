import browser from 'sinon-chrome'
import AbortController from 'abort-controller'
import DeclarativeNetRequestMock from './redirect-handler/declarativeNetRequest.mock.js'
import sinon from 'sinon'

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
  browser.flush()
})
