
import debug from 'debug'
import { CompanionState } from '../types/companion.js'
import { consentTypes } from '@ipfs-shipyard/ignite-metrics'

const log = debug('ipfs-companion:telemetry')

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
      // TODO: implement adding consent
    } else {
      log(`Removing consent for '${groupName}'`)
      // TODO: implement removing consent
    }
  }
}

const ignoredViewsRegex: RegExp[] = []

/**
 * TrackView is a wrapper around ignite-metrics trackView
 *
 * @note: currently it's a no-op because of https://github.com/ipfs/ipfs-companion/issues/1315
 * @param view
 * @param segments
 */
export function trackView (view: string, segments: Record<string, string>): void {
  log('trackView called for view: ', view)
  // TODO: implement tracking for views
}

/**
 * TrackView is a wrapper around ignite-metrics trackView
 *
 * @param event
 * @param segments
 */
export function trackEvent (event: object): void {
  log('trackEvent called for event: ', event)
  // TODO: implement tracking for events
}
