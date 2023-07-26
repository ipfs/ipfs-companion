import { trackEvent } from '../telemetry.js'
import { IMessageHandler } from './IMessageHandler.js'

interface IRequestTrackerMsg {
  type: string
  requestType: string
}

export default class RequestTracker implements IMessageHandler<IRequestTrackerMsg> {
  private readonly eventKey: 'url-observed' | 'url-resolved'
  private readonly flushInterval: number = 1000 * 60 * 5 // 5 minutes
  private readonly msgKey: string = 'ipfs-companion:track-request:'
  private lastSync: number = Date.now()
  private requestTypeStore: Record<string, number> = {}

  constructor (eventKey: 'url-observed' | 'url-resolved') {
    this.eventKey = eventKey
    this.setupFlushScheduler()
  }

  get checkKey (): string {
    return this.msgKey + this.eventKey
  }

  check ({ type }: IRequestTrackerMsg): boolean {
    return type === this.checkKey
  }

  async handler ({ requestType }: IRequestTrackerMsg): Promise<any> {
    if (!(requestType in this.requestTypeStore)) {
      this.requestTypeStore[requestType] = 0
    }
    this.requestTypeStore[requestType] += 1
  }

  private flushStore (): void {
    const count = Object.values(this.requestTypeStore).reduce((a, b): number => a + b, 0)
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
