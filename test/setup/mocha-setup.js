import AbortController from 'abort-controller'
import { afterEach } from 'mocha'
import sinon from 'sinon'
import browser from 'sinon-chrome'
import DeclarativeNetRequestMock from '../functional/lib/redirect-handler/declarativeNetRequest.mock.js'
import isMv3TestingEnabled from '../helpers/is-mv3-testing-enabled.js'

browser.runtime.id = 'testid'
global.browser = browser
global.AbortController = AbortController
global.chrome = browser
global.navigator = {
  clipboard: {
    writeText: () => {}
  }
}

if (isMv3TestingEnabled()) {
  const sinonSandbox = sinon.createSandbox()
  global.browser.declarativeNetRequest = sinonSandbox.spy(new DeclarativeNetRequestMock())

  afterEach(function () {
    sinonSandbox.resetHistory()
  })
} else {

}
