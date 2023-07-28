import debug from 'debug'
import { trackEvent } from '../telemetry.js'

export class RequestTracker {
  private readonly eventKey: 'url-observed' | 'url-resolved'
  private readonly flushInterval: number = 1000 * 60 * 5 // 5 minutes
  private readonly log: debug.Debugger & { error?: debug.Debugger }
  private lastSync: number = Date.now()
  private requestTypeStore: Record<string, number> = {}

  constructor (eventKey: 'url-observed' | 'url-resolved') {
    this.eventKey = eventKey
    this.log = debug(`ipfs-companion:request-tracker:${eventKey}`)
    this.log.error = debug(`ipfs-companion:request-tracker:${eventKey}:error`)
    this.setupFlushScheduler()
  }

  async track ({ type }: { type: string }): Promise<any> {
    this.log(`track ${type}`, JSON.stringify(this.requestTypeStore))
    if (!(type in this.requestTypeStore)) {
      this.requestTypeStore[type] = 0
    }
    this.requestTypeStore[type] += 1
  }

  private flushStore (): void {
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
