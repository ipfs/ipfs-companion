import browser from 'webextension-polyfill'
import MetricsProvider from '@ipfs-shipyard/ignite-metrics/MetricsProvider'
import PatchedCountly from 'countly-sdk-web'
import debug from 'debug'
import { WebExtensionStorageProvider } from './storage-provider/WebExtensionStorageProvider.js'

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
export function handleConsentFromState (state) {
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
      metricsProvider.addConsent(groupName)
    } else {
      log(`Removing consent for '${groupName}'`)
      metricsProvider.removeConsent(groupName)
    }
  }
}

const ignoredViewsRegex = []
export function trackView (view, segments) {
  log('trackView called for view: ', view)
  const { version } = browser.runtime.getManifest()
  metricsProvider.trackView(view, ignoredViewsRegex, { ...segments, version })
}

export const startSession = (...args) => metricsProvider.startSession(...args)
export const endSession = (...args) => metricsProvider.endSession(...args)
