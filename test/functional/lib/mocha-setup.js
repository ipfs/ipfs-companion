import browser from 'sinon-chrome'
import AbortController from 'abort-controller'
browser.runtime.id = 'testid'
global.browser = browser
global.AbortController = AbortController
global.chrome = browser
global.navigator = {
  clipboard: {
    writeText: () => {}
  }
}
