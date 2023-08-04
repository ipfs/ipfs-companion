import debug from 'debug'
import type browser from 'webextension-polyfill'
import { trackEvent } from '../telemetry.js'

export class RequestTracker {
  private readonly eventKey: 'url-observed' | 'url-resolved'
  private readonly flushInterval: number
  private readonly log: debug.Debugger & { error?: debug.Debugger }
  private lastSync: number = Date.now()
  private requestTypeStore: { [key in browser.WebRequest.ResourceType]?: number } = {}

  constructor (eventKey: 'url-observed' | 'url-resolved', flushInterval = 1000 * 60 * 5) {
    this.eventKey = eventKey
    this.log = debug(`ipfs-companion:request-tracker:${eventKey}`)
    this.log.error = debug(`ipfs-companion:request-tracker:${eventKey}:error`)
    this.flushInterval = flushInterval
    this.setupFlushScheduler()
  }

  track ({ type }: browser.WebRequest.OnBeforeRequestDetailsType): void {
    this.log(`track ${type}`, JSON.stringify(this.requestTypeStore))
    this.requestTypeStore[type] = (this.requestTypeStore[type] ?? 0) + 1
  }

  private flushStore (): void {
    this.log('flushing')
    const count = Object.values(this.requestTypeStore).reduce((a, b): number => a + b, 0)
    if (count === 0) {
      this.log('nothing to flush')
      return
    }
    trackEvent({
      key: this.eventKey,
      count,
      dur: Date.now() - this.lastSync,
      segmentation: Object.assign({}, this.requestTypeStore) as unknown as Record<string, string>
    })
    // reset
    this.lastSync = Date.now()
    this.requestTypeStore = {}
  }

  private setupFlushScheduler (): void {
    setTimeout(() => {
      this.flushStore()
      this.setupFlushScheduler()
    }, this.flushInterval)
  }
}
