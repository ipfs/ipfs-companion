import browser from 'webextension-polyfill'
import debug from 'debug'

const log = debug('ipfs-companion:redirect-handler:blockOrObserve')
log.error = debug('ipfs-companion:redirect-handler:blockOrObserve:error')

class BlockOrObserve {
  private _supportsBlock: boolean

  constructor () {
    this._supportsBlock = false
    this._test()
  }

  private _test (): void {
    log('Testing if browser supports blocking requests')
    const listenerRef = (): void => { }
    try {
      browser.webRequest.onBeforeRequest.addListener(listenerRef, { urls: ['https://ipfs.io'] }, ['blocking'])
      this._supportsBlock = true
      browser.webRequest.onBeforeRequest.removeListener(listenerRef)
    } catch (e) {
      log.error('Browser does not support blocking requests')
    }
  }

  public getExtraInfoSpec<T>(additionalParams: T[] = []): T[] {
    if (this._supportsBlock) {
      return ['blocking' as T, ...additionalParams]
    }
    return additionalParams
  }
}

const blockOrObserve = new BlockOrObserve()
export default blockOrObserve
