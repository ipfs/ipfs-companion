import { expect } from 'chai';
import sinon from 'sinon';
import browser from 'sinon-chrome';
import PatchedCountly from 'countly-sdk-web'
import { DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL, RequestTracker } from './../../../../add-on/src/lib/trackers/requestTracker.js'

const sinonSandBox = sinon.createSandbox()
describe('lib/trackers/requestTracker', () => {

  let requestTracker: RequestTracker
  let countlySDKStub: sinon.SinonStub
  let clock: sinon.SinonFakeTimers

  before(() => {
    clock = sinonSandBox.useFakeTimers()
    countlySDKStub = sinonSandBox.stub(PatchedCountly)
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
      sinon.assert.calledWith(countlySDKStub.add_event, {
        key: 'url-observed',
        count: 1,
        dur: 3600000,
        segmentation: {
          main_frame: 1
        }
      })
    })

    it('should track multiple requests', async () => {
      await requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'sub_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'xmlHTTPRequest' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
      sinon.assert.calledWith(countlySDKStub.add_event, {
        key: 'url-observed',
        count: 3,
        dur: 3600000,
        segmentation: {
          main_frame: 1,
          sub_frame: 1,
          xmlHTTPRequest: 1
        }
      })
    })

    it('should not send event if count is 0', async () => {
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)

      sinon.assert.notCalled(countlySDKStub.add_event)
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
      sinon.assert.calledWith(countlySDKStub.add_event, {
        key: 'url-resolved',
        count: 1,
        dur: 3600000,
        segmentation: {
          main_frame: 1
        }
      })
    })

    it('should track multiple requests', async () => {
      await requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'sub_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      await requestTracker.track({ type: 'xmlHTTPRequest' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
      sinon.assert.calledWith(countlySDKStub.add_event, {
        key: 'url-resolved',
        count: 3,
        dur: 3600000,
        segmentation: {
          main_frame: 1,
          sub_frame: 1,
          xmlHTTPRequest: 1
        }
      })
    })

    it('should not send event if count is 0', async () => {
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)

      sinon.assert.notCalled(countlySDKStub.add_event)
    })
  })
})
