import debug from 'debug'
import { CompanionState } from '../types/companion.js'

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
      log(`Telemetry consent for '${groupName}' would be enabled, but tracking has been removed`)
    } else {
      log(`Telemetry consent for '${groupName}' is disabled`)
    }
  }
}

const ignoredViewsRegex: RegExp[] = []

/**
 * TrackView is a no-op function that only logs debug messages
 * Tracking functionality has been removed
 *
 * @param view
 * @param segments
 */
export function trackView (view: string, segments: Record<string, string>): void {
  log('trackView called for view (no-op): ', view)
}

/**
 * TrackEvent is a no-op function that only logs debug messages
 * Tracking functionality has been removed
 *
 * @param event
 */
export function trackEvent (event: object): void {
  log('trackEvent called for event (no-op): ', event)
}
