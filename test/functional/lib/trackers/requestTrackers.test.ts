import { expect } from 'chai';
import sinon from 'sinon';
import browser from 'sinon-chrome';
import PatchedCountly from 'countly-sdk-web'
import { DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL, REQUEST_TRACKER_SYNC_INTERVAL, RequestTracker } from './../../../../add-on/src/lib/trackers/requestTracker.js'

const sinonSandBox = sinon.createSandbox()
describe('lib/trackers/requestTracker', () => {

  let countlySDKStub: sinon.SinonStub
  let clock: sinon.SinonFakeTimers
  let requestTracker

  before(() => {
    clock = sinonSandBox.useFakeTimers()
    countlySDKStub = sinonSandBox.stub(PatchedCountly)
  })

  afterEach(() => {
    sinonSandBox.resetHistory()
    browser.storage.local.get.reset()
    browser.storage.local.set.reset()
  })

  describe('url-observed', () => {
    before(() => {
      requestTracker = new RequestTracker('url-observed')
    })

    it('should init a Tracker', () => {
      expect(requestTracker).to.have.property('track')
    })

    it.only('should track a request', async () => {
      requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      browser.storage.local.get.returns(null)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL)
      browser.storage.local.get.returns({ lastSync: Date.now(), requestTypeStore: { main_frame: 1 } })
      clock.tick(REQUEST_TRACKER_SYNC_INTERVAL)
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
      requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      requestTracker.track({ type: 'sub_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      requestTracker.track({ type: 'xmlHTTPRequest' } as browser.WebRequest.OnBeforeRequestDetailsType)
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
      requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      clock.tick(DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL + 1000)
      expect(browser.storage.local.set.lastCall.args).to.deep.equal([])
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
      requestTracker.track({ type: 'main_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      requestTracker.track({ type: 'sub_frame' } as browser.WebRequest.OnBeforeRequestDetailsType)
      requestTracker.track({ type: 'xmlHTTPRequest' } as browser.WebRequest.OnBeforeRequestDetailsType)
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
