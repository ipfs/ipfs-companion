import MetricsProvider from '@ipfs-shipyard/ignite-metrics/vanilla'
import debug from 'debug'

const log = debug('ipfs-companion:telemetry')

const metricsProvider = new MetricsProvider({
  appKey: '393f72eb264c28a1b59973da1e0a3938d60dc38a',
  autoTrack: false,
  storageProvider: null
})

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
  log('checkConsent(\'minimal\'): ', metricsProvider.checkConsent('minimal'))
  log('checkConsent(\'performance\'): ', metricsProvider.checkConsent('performance'))
  log('checkConsent(\'ux\'): ', metricsProvider.checkConsent('ux'))
  log('checkConsent(\'feedback\'): ', metricsProvider.checkConsent('feedback'))
  log('checkConsent(\'location\'): ', metricsProvider.checkConsent('location'))
}

/**
 *
 * @param {import('../types.js').CompanionState} state
 * @returns {void}
 */
export function handleConsentFromState (state) {
  metricsProvider.updateConsent(mapStateToConsent(state))
  logConsent()
}

export function handleConsentUpdate (consent) {
  log('handleConsentUpdate', consent)
  metricsProvider.updateConsent(consent)
}

const ignoredViewsRegex = []
export function trackView (view) {
  log('trackView called for view: ', view)
  metricsProvider.metricsService.track_view(view, ignoredViewsRegex)
}

export const startSession = (...args) => metricsProvider.startSession(...args)
export const endSession = (...args) => metricsProvider.endSession(...args)
