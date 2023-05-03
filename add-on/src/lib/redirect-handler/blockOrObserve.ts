import browser from 'webextension-polyfill'
import debug from 'debug'
import { CompanionState } from '../../types/companion.js'
import { dropSlash } from '../ipfs-path.js'

const log = debug('ipfs-companion:redirect-handler:blockOrObserve')
log.error = debug('ipfs-companion:redirect-handler:blockOrObserve:error')

interface regexFilterMap {
  id: number
  regexSubstitution: string
}

interface redirectHandlerInput {
  originUrl: string
  redirectUrl: string
}

const savedRegexFilters: Map<string, regexFilterMap> = new Map()
const DEFAULT_LOCAL_RULES: redirectHandlerInput[] = [
  {
    originUrl: 'http://127.0.0.1',
    redirectUrl: 'http://localhost'
  },
  {
    originUrl: 'http://[::1]',
    redirectUrl: 'http://localhost'
  }
]

/**
 *
 * @param url
 * @returns
 */
export function isLocalHost (url: string): boolean {
  return url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://[::1]')
}

/**
 * Escape the characters that are allowed in the URL, but not in the regex.
 *
 * @param str URL string to escape
 * @returns
 */
function escapeURLRegex (str: string): string {
  // these characters are allowed in the URL, but not in the regex.
  // eslint-disable-next-line no-useless-escape
  const ALLOWED_CHARS_URL_REGEX = /([:\/\?#\[\]@!$&'\(\ )\*\+,;=-_\.~])/g
  return str.replace(ALLOWED_CHARS_URL_REGEX, '\\$1')
}

/**
 * Construct a regex filter and substitution for a redirect.
 *
 * @param originUrl
 * @param redirectUrl
 * @returns
 */
function constructRegexFilter ({ originUrl, redirectUrl }: redirectHandlerInput): {
  regexSubstitution: string
  regexFilter: string
} {
  // We can traverse the URL from the end, and find the first character that is different.
  let commonIdx = 1
  while (commonIdx < Math.min(originUrl.length, redirectUrl.length)) {
    if (originUrl[originUrl.length - commonIdx] !== redirectUrl[redirectUrl.length - commonIdx]) {
      break
    }
    commonIdx += 1
  }

  // We can now construct the regex filter and substitution.
  let regexSubstitution = redirectUrl.slice(0, redirectUrl.length - commonIdx + 1) + '\\1'
  // We need to escape the characters that are allowed in the URL, but not in the regex.
  const regexFilterFirst = escapeURLRegex(originUrl.slice(0, originUrl.length - commonIdx + 1))
  // We need to match the rest of the URL, so we can use a wildcard.
  let regexFilter = `^${regexFilterFirst}(.*)$`.replace('https', 'https?')

  // This method does not parse:
  // originUrl: "https://awesome.ipfs.io/"
  // redirectUrl: "http://localhost:8081/ipns/awesome.ipfs.io/"
  // that ends up with capturing all urls which we do not want.
  if (regexFilter === '^https?\\:\\/(.*)$') {
    const subdomain = new URL(originUrl).hostname
    regexFilter = `^https?\\:\\/\\/${escapeURLRegex(subdomain)}(.*)$`
    regexSubstitution = regexSubstitution.replace('\\1', `/${subdomain}\\1`)
  }

  return { regexSubstitution, regexFilter }
}

// We need to check if the browser supports the declarativeNetRequest API.
// TODO: replace with check for `Blocking` in `chrome.webRequest.OnBeforeRequestOptions`
// which is currently a bug https://bugs.chromium.org/p/chromium/issues/detail?id=1427952
export const supportsBlock = !(browser.declarativeNetRequest?.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES === 5000)

// If the browser supports the declarativeNetRequest API, we can block the request.
export function getExtraInfoSpec<T> (additionalParams: T[] = []): T[] {
  if (supportsBlock) {
    return ['blocking' as T, ...additionalParams]
  }
  return additionalParams
}

/**
 * Validates if the rule has changed.
 *
 * @param rule
 * @returns {boolean}
 */
function validateIfRuleChanged (rule: browser.DeclarativeNetRequest.Rule): boolean {
  const savedRule = savedRegexFilters.get(rule.condition.regexFilter as string)
  if (savedRule != null) {
    return savedRule.id !== rule.id || savedRule.regexSubstitution !== rule.action.redirect?.regexSubstitution
  }
  return false
}

/**
 * Reconciles the rules on fresh start.
 *
 * @param {CompanionState} state
 */
async function reconcileRulesAndRemoveOld (state: CompanionState): Promise<void> {
  const rules = await browser.declarativeNetRequest.getDynamicRules()
  const addRules: browser.DeclarativeNetRequest.Rule[] = []
  const removeRuleIds: number[] = []
  for (const rule of rules) {
    if (rule.action.type === 'redirect' &&
      rule.condition.regexFilter !== undefined &&
      rule.action.redirect?.regexSubstitution !== undefined) {
      if (!rule.action.redirect?.regexSubstitution.includes(dropSlash(state.gwURLString)) ||
        validateIfRuleChanged(rule)
      ) {
        // We need to remove the old rule.
        removeRuleIds.push(rule.id)
        savedRegexFilters.delete(rule.condition.regexFilter)
      } else {
        savedRegexFilters.set(rule.condition.regexFilter, {
          id: rule.id,
          regexSubstitution: rule.action.redirect?.regexSubstitution
        })
      }
    }
  }
  for (const { originUrl, redirectUrl } of DEFAULT_LOCAL_RULES) {
    const { port } = new URL(state.gwURLString)
    const regexFilter = `^${escapeURLRegex(`${originUrl}:${port}`)}(.*)$`
    const regexSubstitution = `${redirectUrl}:${port}\\1`

    if (!(regexFilter in savedRegexFilters)) {
      // We need to add the new rule.
      addRules.push(generateRule(regexFilter, regexSubstitution))
    }
  }
  await browser.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds })
}

/**
 * Generates a rule for the declarativeNetRequest API.
 *
 * @param regexFilter - The regex filter for the rule.
 * @param regexSubstitution  - The regex substitution for the rule.
 * @param excludedInitiatorDomains - The domains that are excluded from the rule.
 * @returns
 */
function generateRule (
  regexFilter: string,
  regexSubstitution: string,
  excludedInitiatorDomains: string[] = []
): browser.DeclarativeNetRequest.Rule {
  // We need to generate a random ID for the rule.
  const id = Math.floor(Math.random() * 29999)
  // We need to save the regex filter and ID to check if the rule already exists later.
  savedRegexFilters.set(regexFilter, { id, regexSubstitution })

  return {
    id,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { regexSubstitution }
    },
    condition: {
      regexFilter,
      excludedInitiatorDomains,
      resourceTypes: [
        'csp_report',
        'font',
        'image',
        'main_frame',
        'media',
        'object',
        'other',
        'ping',
        'script',
        'stylesheet',
        'sub_frame',
        'webbundle',
        'websocket',
        'webtransport',
        'xmlhttprequest'
      ]
    }
  }
}

/**
 * Register a redirect rule in the dynamic rule set.
 *
 * @param {redirectHandlerInput} input
 * @returns {Promise<void>}
 */
export function addRuleToDynamicRuleSetGenerator (
  getState: () => CompanionState): (input: redirectHandlerInput) => Promise<void> {
  // returning a closure to avoid passing `getState` as an argument to `addRuleToDynamicRuleSet`.
  return async function ({ originUrl, redirectUrl }: redirectHandlerInput): Promise<void> {
    const state = getState()
    // We don't want to redirect to the same URL. Or to the gateway.
    if (originUrl === redirectUrl ||
      (originUrl.includes(state.gwURL.host) && !redirectUrl.includes('recovery')) ||
      (isLocalHost(redirectUrl) && isLocalHost(originUrl))) {
      return
    }

    // We need to construct the regex filter and substitution.
    const { regexSubstitution, regexFilter } = constructRegexFilter({ originUrl, redirectUrl })

    // We need to check if the rule already exists.
    const savedRule = savedRegexFilters.get(regexFilter)
    if ((savedRule != null) && savedRule.regexSubstitution !== regexSubstitution) {
      const removeRuleIds: number[] = []
      if (regexFilter in savedRegexFilters) {
        // We need to remove the old rule.
        removeRuleIds.push(savedRule.id)
        savedRegexFilters.delete(regexFilter)
      }

      await browser.declarativeNetRequest.updateDynamicRules(
        {
          // We need to add the new rule.
          addRules: [generateRule(regexFilter, regexSubstitution)],
          // We need to remove the old rules.
          removeRuleIds
        }
      )
    }

    // async call to reconcile rules and remove old ones.
    await reconcileRulesAndRemoveOld(state)
  }
}
