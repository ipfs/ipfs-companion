
import { MetricsProvider } from '@ipfs-shipyard/ignite-metrics/vanilla'

const metricsProvider = new MetricsProvider('393f72eb264c28a1b59973da1e0a3938d60dc38a')
/**
 * @param {() => ReturnType<import('./state')['initState']>} getState
 * @returns {void}
 */
export async function initializeTelemetry (getState) {
  // await metricsProvider.init()
  // initCountlyMetrics('393f72eb264c28a1b59973da1e0a3938d60dc38a')
  handleConsentFromState(getState())
}

/**
 * @param {ReturnType<import('./state').initState>['options']} state
 * @returns {string[]}
 */
function mapStateToConsent (stateOptions) {
  const obj = {
    minimal: stateOptions.telemetryGroupMinimal,
    marketing: stateOptions.telemetryGroupMarketing,
    performance: stateOptions.telemetryGroupPerformance,
    tracking: stateOptions.telemetryGroupTracking
  }

  const enabledConsentGroups = Object.keys(obj).filter(key => obj[key] === true)
  console.log('enabledConsentGroups: ', enabledConsentGroups)
  return enabledConsentGroups
}
/**
 *
 * @param {ReturnType<import('./state')['initState']>} state
 * @returns {void}
 */
export function handleConsentFromState (state) {
  const { options } = state
  console.log('handleConsentFromState', options)
  metricsProvider.updateConsent(mapStateToConsent(options))
}
