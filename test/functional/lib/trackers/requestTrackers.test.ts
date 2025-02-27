import { expect } from 'chai';
import sinon from 'sinon';
import browser from 'sinon-chrome';
import { DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL, RequestTracker } from './../../../../add-on/src/lib/trackers/requestTracker.js'

const sinonSandBox = sinon.createSandbox()
describe.skip('lib/trackers/requestTracker', () => {

  let requestTracker: RequestTracker
  let countlySDKStub: sinon.SinonStub
  let clock: sinon.SinonFakeTimers

  before(() => {
    clock = sinonSandBox.useFakeTimers()
  })

  afterEach(() => {
    sinonSandBox.resetHistory()
  })

  describe('url-observed', () => {
    before(() => {
      requestTracker = new RequestTracker('url-observed')
    })

    it('should init a Tracker', () => {
      expect(requestTracker).to.be.instanceOf(RequestTracker)
      expect(requestTracker).to.have.property('track')
    })

    it('should track a request', async () => {
      await requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
    })

    it('should track multiple requests', async () => {
      await requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'sub_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'xmlHTTPRequest' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
    })

    it('should not send event if count is 0', async () => {
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
    })
  })

  describe('url-resolved', () => {
    before(() => {
      requestTracker = new RequestTracker('url-resolved')
    })

    it('should init a Tracker', () => {
      expect(requestTracker).to.be.instanceOf(RequestTracker)
      expect(requestTracker).to.have.property('track')
    })

    it('should track a request', async () => {
      await requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
    })

    it('should track multiple requests', async () => {
      await requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'sub_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'xmlHTTPRequest' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
    })

    it('should not send event if count is 0', async () => {
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
    })
  })
})
