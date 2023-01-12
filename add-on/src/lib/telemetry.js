
import { MetricsProvider } from '@ipfs-shipyard/ignite-metrics/vanilla'
import debug from 'debug'

const log = debug('ipfs-companion:telemetry')

let metricsProvider = null
export function getMetricsProviderInstance () {
  metricsProvider = metricsProvider ?? new MetricsProvider({
    appKey: '393f72eb264c28a1b59973da1e0a3938d60dc38a',
    autoTrack: false
  })

  return metricsProvider
}

/**
 * @param {import('../types.js').CompanionState} stateOptions
 * @returns {string[]}
 */
function mapStateToConsent (stateOptions) {
  const obj = {
    minimal: stateOptions?.telemetryGroupMinimal || false,
    performance: stateOptions?.telemetryGroupPerformance || false,
    ux: stateOptions?.telemetryGroupUx || false,
    feedback: stateOptions?.telemetryGroupFeedback || false,
    location: stateOptions?.telemetryGroupLocation || false
  }

  const enabledConsentGroups = Object.keys(obj).filter(key => obj[key] === true)
  log('enabledConsentGroups: ', enabledConsentGroups)
  return enabledConsentGroups
}

function logConsent () {
  log('checkConsent(\'minimal\'): ', getMetricsProviderInstance().checkConsent('minimal'))
  log('checkConsent(\'performance\'): ', getMetricsProviderInstance().checkConsent('performance'))
  log('checkConsent(\'marketing\'): ', getMetricsProviderInstance().checkConsent('marketing'))
  log('checkConsent(\'tracking\'): ', getMetricsProviderInstance().checkConsent('tracking'))
}

/**
 *
 * @param {import('../types.js').CompanionState} state
 * @returns {void}
 */
export function handleConsentFromState (state) {
  log('handleConsentFromState', state)
  getMetricsProviderInstance().updateConsent(mapStateToConsent(state))
  logConsent()
}

export function handleConsentUpdate (consent) {
  log('handleConsentUpdate', consent)
  getMetricsProviderInstance().updateConsent(consent)
}

// const ignoredViewsRegex = [/^ipfs:\/\/.*/]
const ignoredViewsRegex = []
export function trackView (view) {
  log('trackView called for view: ', view)
  getMetricsProviderInstance().metricsService.track_pageview(view, ignoredViewsRegex)
}

export const startSession = (...args) => getMetricsProviderInstance().startSession(...args)
export const endSession = (...args) => getMetricsProviderInstance().endSession(...args)
