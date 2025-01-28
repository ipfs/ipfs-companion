import debug from 'debug'
import browser from 'webextension-polyfill'
import { trackEvent } from '../telemetry.js'

export const DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL = 1000 * 60 * 60
export const REQUEST_TRACKER_SYNC_INTERVAL = 1000 * 60 * 60 * 24
export const REQUEST_TRACKER_LOCAL_STORAGE_KEY = 'request-tracker'

interface RequestTrackerPersistedState {
  lastSync: number
  requestTypeStore: { [key in browser.WebRequest.ResourceType]?: number }
}

export class RequestTracker {
  private readonly eventKey: 'url-observed' | 'url-resolved'
  private readonly flushInterval: number
  private readonly log: debug.Debugger & { error?: debug.Debugger }
  private requestTypeStore: RequestTrackerPersistedState['requestTypeStore'] = {}

  constructor (eventKey: 'url-observed' | 'url-resolved', flushInterval = DEFAULT_REQUEST_TRACKER_FLUSH_INTERVAL) {
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

  private async flushStoreToMemory (): Promise<void> {
    this.log('flushing to memory')

    const persistedState = await browser.storage.local.get(REQUEST_TRACKER_LOCAL_STORAGE_KEY) as RequestTrackerPersistedState ?? {
      lastSync: Date.now(),
      requestTypeStore: {}
    }

    // merge
    const { lastSync, requestTypeStore } = persistedState

    const mergedRequestTypeKeys: Set<browser.WebRequest.ResourceType> = new Set([
      ...Object.keys(requestTypeStore) as browser.WebRequest.ResourceType[],
      ...Object.keys(this.requestTypeStore) as browser.WebRequest.ResourceType[]
    ])

    const mergedRequestTypeStore = Object.fromEntries([...mergedRequestTypeKeys].map((key): [
      browser.WebRequest.ResourceType,
      number
    ] => ([
      key,
      (requestTypeStore?.[key] ?? 0) + (this.requestTypeStore?.[key] ?? 0)
    ])))

    await browser.storage.local.set({
      [REQUEST_TRACKER_LOCAL_STORAGE_KEY]: {
        lastSync,
        requestTypeStore: mergedRequestTypeStore
      }
    })

    // reset
    this.requestTypeStore = {}
    await this.syncEventsToTelemetry()
  }

  private async syncEventsToTelemetry (): Promise<void> {
    this.log('syncing')
    const currentTimestamp = Date.now()
    const persistedState = await browser.storage.local.get(REQUEST_TRACKER_LOCAL_STORAGE_KEY) as RequestTrackerPersistedState
    const { lastSync, requestTypeStore } = persistedState

    // skip if we already synced recently
    if (lastSync + REQUEST_TRACKER_SYNC_INTERVAL > currentTimestamp) {
      this.log('sync skipped')
      return
    }

    // skip if there is nothing to sync
    const count = Object.values(requestTypeStore).reduce((a, b): number => a + b, 0)

    if (count === 0) {
      this.log('nothing to flush')
      return
    }

    // sync
    trackEvent({
      key: this.eventKey,
      count,
      dur: currentTimestamp - lastSync,
      segmentation: Object.assign({}, this.requestTypeStore) as unknown as Record<string, string>
    })

    // reset
    await browser.storage.local.set({
      [REQUEST_TRACKER_LOCAL_STORAGE_KEY]: {
        lastSync: currentTimestamp,
        requestTypeStore: {}
      }
    })
  }

  private setupFlushScheduler (): void {
    setTimeout(async () => {
      await this.flushStoreToMemory()
      this.setupFlushScheduler()
    }, this.flushInterval)
  }
}
