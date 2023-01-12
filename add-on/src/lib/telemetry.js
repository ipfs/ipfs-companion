
import { MetricsProvider } from '@ipfs-shipyard/ignite-metrics/vanilla'

let metricsProvider = null
export function getMetricsProviderInstance () {
  metricsProvider = metricsProvider ?? new MetricsProvider({
    appKey: '393f72eb264c28a1b59973da1e0a3938d60dc38a',
    autoTrack: false
  })

  return metricsProvider
}

/**
 * @param {ReturnType<import('./state').initState>['options']} state
 * @returns {string[]}
 */
function mapStateToConsent (stateOptions) {
  const obj = {
    minimal: stateOptions?.telemetryGroupMinimal || false,
    marketing: stateOptions?.telemetryGroupMarketing || false,
    performance: stateOptions?.telemetryGroupPerformance || false,
    tracking: stateOptions?.telemetryGroupTracking || false
  }

  const enabledConsentGroups = Object.keys(obj).filter(key => obj[key] === true)
  console.log('enabledConsentGroups: ', enabledConsentGroups)
  return enabledConsentGroups
}

function logConsent () {
  console.log('checkConsent(\'minimal\'): ', getMetricsProviderInstance().checkConsent('minimal'))
  console.log('checkConsent(\'marketing\'): ', getMetricsProviderInstance().checkConsent('marketing'))
  console.log('checkConsent(\'performance\'): ', getMetricsProviderInstance().checkConsent('performance'))
  console.log('checkConsent(\'tracking\'): ', getMetricsProviderInstance().checkConsent('tracking'))
}

/**
 *
 * @param {ReturnType<import('./state')['initState']>} state
 * @returns {void}
 */
export function handleConsentFromState (state) {
  console.log('handleConsentFromState', state)
  getMetricsProviderInstance().updateConsent(mapStateToConsent(state))
  logConsent()
}

export function handleConsentUpdate (consent) {
  console.log('handleConsentUpdate', consent)
  getMetricsProviderInstance().updateConsent(consent)
}

// const ignoredViewsRegex = [/^ipfs:\/\/.*/]
const ignoredViewsRegex = []
export function trackView (view) {
  console.log('trackView called for view: ', view)
  getMetricsProviderInstance().metricsService.track_pageview(view, ignoredViewsRegex)
}

export const startSession = (...args) => getMetricsProviderInstance().startSession(...args)
export const endSession = (...args) => getMetricsProviderInstance().endSession(...args)
