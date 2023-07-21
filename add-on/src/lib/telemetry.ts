import browser from 'webextension-polyfill'
import MetricsProvider from '@ipfs-shipyard/ignite-metrics/browser-vanilla'
import PatchedCountly from 'countly-sdk-web'
import debug from 'debug'
import { WebExtensionStorageProvider } from './storage-provider/WebExtensionStorageProvider.js'
import { CompanionState } from '../types/companion.js'
import { consentTypes } from '@ipfs-shipyard/ignite-metrics'

const log = debug('ipfs-companion:telemetry')

const metricsProvider = new MetricsProvider({
  appKey: '393f72eb264c28a1b59973da1e0a3938d60dc38a',
  autoTrack: false,
  metricsService: PatchedCountly,
  storage: 'none',
  storageProvider: new WebExtensionStorageProvider()
})

/**
 *
 * @param {import('../types/companion.js').CompanionState} state
 * @returns {void}
 */
export async function handleConsentFromState (state: CompanionState): Promise<void> {
  const telemetryGroups = {
    minimal: state?.telemetryGroupMinimal || false,
    performance: state?.telemetryGroupPerformance || false,
    ux: state?.telemetryGroupUx || false,
    feedback: state?.telemetryGroupFeedback || false,
    location: state?.telemetryGroupLocation || false
  }
  for (const [groupName, isEnabled] of Object.entries(telemetryGroups)) {
    if (isEnabled) {
      log(`Adding consent for '${groupName}'`)
      await metricsProvider.addConsent(groupName as consentTypes)
    } else {
      log(`Removing consent for '${groupName}'`)
      await metricsProvider.removeConsent(groupName as consentTypes)
    }
  }
}

const ignoredViewsRegex: RegExp[] = []

/**
 * TrackView is a wrapper around ignite-metrics trackView
 *
 * @param view
 * @param segments
 */
export function trackView (view: string, segments: Record<string, string> = {}): void {
  log('trackView called for view: ', view)
  const { version } = browser.runtime.getManifest()
  metricsProvider.trackView(view, ignoredViewsRegex, { ...segments, version })
}

export const startSession = (...args: any[]): void => metricsProvider.startSession(...args)
export const endSession = (...args: any[]): void => metricsProvider.endSession(...args)
