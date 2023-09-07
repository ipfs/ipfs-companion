import debug from 'debug'
import isIPFS from 'is-ipfs'
import browser from 'webextension-polyfill'
import { CompanionState } from '../../types/companion.js'
import { brave } from '../ipfs-client/brave.js'
import { IFilter, IRegexFilter, RegexFilter } from './baseRegexFilter.js'
import { CommonPatternRedirectRegexFilter } from './commonPatternRedirectRegexFilter.js'
import { NamespaceRedirectRegexFilter } from './namespaceRedirectRegexFilter.js'
import { SubdomainRedirectRegexFilter } from './subdomainRedirectRegexFilter.js'

// this won't work in webworker context. Needs to be enabled manually
// https://github.com/debug-js/debug/issues/916
const log = debug('ipfs-companion:redirect-handler:blockOrObserve')
log.error = debug('ipfs-companion:redirect-handler:blockOrObserve:error')

export const DEFAULT_NAMESPACES = new Set(['ipfs', 'ipns'])
export const GLOBAL_STATE_OPTION_CHANGE = 'GLOBAL_STATE_OPTION_CHANGE'
export const DELETE_RULE_REQUEST = 'DELETE_RULE_REQUEST'
export const DELETE_RULE_REQUEST_SUCCESS = 'DELETE_RULE_REQUEST_SUCCESS'

// We need to match the rest of the URL, so we can use a wildcard.
export const RULE_REGEX_ENDING = '((?:[^\\.]|$).*)$'

interface regexFilterMap {
  id: number
  regexSubstitution: string
}

interface redirectPair {
  originUrl: string,
  redirectUrl: string
  getPort: (state: CompanionState) => string
}

interface redirectRegexPair {
  regexSubstitution: string,
  regexFilter: string
}

interface redirectHandlerInput extends Omit<redirectPair, 'redirectUrl'> {
  priority?: number
  getRedirectUrl: (port: string) => string
  getPort: (state: CompanionState) => string
}

type messageToSelfType = typeof GLOBAL_STATE_OPTION_CHANGE | typeof DELETE_RULE_REQUEST

interface messageToSelf {
  type: messageToSelfType
  value?: string | Record<string, unknown>
}

export const defaultNSRegexStr = `(${[...DEFAULT_NAMESPACES].join('|')})`

// We need to check if the browser supports the declarativeNetRequest API.
// TODO: replace with check for `Blocking` in `chrome.webRequest.OnBeforeRequestOptions`
// which is currently a bug https://bugs.chromium.org/p/chromium/issues/detail?id=1427952
// this needs to be a function call, because in tests we mock browser.declarativeNetRequest
// the way sinon ends up stubbing it, it's not directly available in the global scope on import
// rather it gets replaced dynamically when the module is imported. Which means, we can't
// just check for the existence of the property, we need to call the browser instance at that point.
export const supportsBlock = (): boolean => !(browser.declarativeNetRequest?.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES > 0)

/**
 * Sends message to self to notify about change.
 *
 * @param msg
 */
async function sendMessageToSelf (msg: messageToSelfType, value?: any): Promise<void> {
  // this check ensures we don't send messages to ourselves if blocking mode is enabled.
  if (!supportsBlock()) {
    const message: messageToSelf = { type: msg, value }
    // on FF, this call waits for the response from the listener.
    // on Chrome, this needs a callback.
    await browser.runtime.sendMessage(message)
  }
}

/**
 * Notify self about option change.
 *
 * @returns void
 */
export async function notifyOptionChange (): Promise<void> {
  log('notifyOptionChange')
  return await sendMessageToSelf(GLOBAL_STATE_OPTION_CHANGE)
}

/**
 * Notify self about rule deletion.
 *
 * @param id number
 * @returns void
 */
export async function notifyDeleteRule (id: number): Promise<void> {
  return await sendMessageToSelf(DELETE_RULE_REQUEST, id)
}

const savedRegexFilters: Map<string, regexFilterMap> = new Map()
const DEFAULT_LOCAL_RULES: redirectHandlerInput[] = [
  {
    originUrl: 'http://127.0.0.1',
    getRedirectUrl: (port): string => `http://localhost:${port}/\\1/\\2`,
    getPort: ({ gwURLString }): string => new URL(gwURLString).port
  },
  {
    originUrl: 'http://[::1]',
    getRedirectUrl: (port): string => `http://localhost:${port}/\\1/\\2`,
    getPort: ({ gwURLString }): string => new URL(gwURLString).port
  },
  {
    originUrl: 'http://localhost',
    getRedirectUrl: (port): string => `http://localhost:${port}/\\1/\\2`,
    getPort: ({ apiURL }): string => new URL(apiURL).port
  },
  ...(brave ? [{
    originUrl: 'http://localhost',
    getRedirectUrl: (): string => `\\1://\\2`,
    getPort: ({ gwURLString }): string => new URL(gwURLString).port,
    priority: 1
  }] : []) as redirectHandlerInput[]
]

/**
 * This function determines if the request is headed to a local IPFS gateway.
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
export function escapeURLRegex (str: string): string {
  // these characters are allowed in the URL, but not in the regex.
  // eslint-disable-next-line no-useless-escape
  const ALLOWED_CHARS_URL_REGEX = /([:\/\?#\[\]@!$&'\(\ )\*\+,;=\-_\.~])/g
  return str.replace(ALLOWED_CHARS_URL_REGEX, '\\$1')
}

/**
 * Compute the namespace from the URL. This finds the first path segment.
 * e.g. http://<gateway>/<namespace>/path/to/file/or/cid
 *
 * @param url string
 */
function computeNamespaceFromUrl (url: string): string {
  const { pathname } = new URL(url)
  // regex to match the first path segment.
  return (/\/([^/]+)\//i.exec(pathname)?.[1] ?? '').toLowerCase()
}

/**
 * Construct a regex filter and substitution for a redirect.
 *
 * @param originUrl
 * @param redirectUrl
 * @returns
 */
function constructRegexFilter ({ originUrl, redirectUrl }: redirectPair): redirectRegexPair {
  // the order is very important here, because we want to match the best possible filter.
  const filtersToTryInOrder: Array<typeof RegexFilter> = [
    SubdomainRedirectRegexFilter,
    NamespaceRedirectRegexFilter,
    CommonPatternRedirectRegexFilter
  ]

  for (const Filter of filtersToTryInOrder) {
    const filter = new Filter({ originUrl, redirectUrl })
    if (filter.canHandle) {
      return filter.filter
    }
  }

  // this is just to satisfy the compiler, this should never happen. Because CommonPatternRedirectRegexFilter can always
  // handle.
  return new CommonPatternRedirectRegexFilter({ originUrl, redirectUrl }).filter
}

// If the browser supports the declarativeNetRequest API, we can block the request.
export function getExtraInfoSpec<T> (additionalParams: T[] = []): T[] {
  if (supportsBlock()) {
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
  if (rule.condition.regexFilter !== undefined) {
    const savedRule = savedRegexFilters.get(rule.condition.regexFilter)
    if (savedRule !== undefined) {
      return savedRule.id !== rule.id || savedRule.regexSubstitution !== rule.action.redirect?.regexSubstitution
    }
  }
  return true
}

/**
 * Clean up all the rules, when extension is disabled.
 */
export async function cleanupRules (resetInMemory: boolean = false): Promise<void> {
  const existingRules = await browser.declarativeNetRequest.getDynamicRules()
  const existingRulesIds = existingRules.map(({ id }): number => id)
  await browser.declarativeNetRequest.updateDynamicRules({ addRules: [], removeRuleIds: existingRulesIds })
  if (resetInMemory) {
    savedRegexFilters.clear()
  }
}

/**
 * Clean up a rule by ID.
 *
 * @param id number
 */
async function cleanupRuleById (id: number): Promise<void> {
  const [{ condition: { regexFilter } }] = await browser.declarativeNetRequest.getDynamicRules({ ruleIds: [id] })
  savedRegexFilters.delete(regexFilter as string)
  await browser.declarativeNetRequest.updateDynamicRules({ addRules: [], removeRuleIds: [id] })
}

/**
 * This function sets up the listeners for the extension.
 * @param {function} handlerFn
 */
function setupListeners (handlers: Record<messageToSelfType, (value: any) => Promise<void>>): void {
  browser.runtime.onMessage.addListener(async (message: messageToSelf): Promise<void> => {
    const { type, value } = message
    if (type in handlers) {
      await handlers[type](value)
    }
  })
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

  // parse the existing rules and remove the ones that are not needed.
  for (const rule of rules) {
    if (rule.action.type === 'redirect' &&
      rule.condition.regexFilter !== undefined &&
      rule.action.redirect?.regexSubstitution !== undefined) {
      if (validateIfRuleChanged(rule)) {
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

  if (!state.active) {
    await cleanupRules()
  } else {
    // add the old rules from memory if state is active.
    if (rules.length === 0) {
      // we need to populate old rules.
      for (const [regexFilter, { regexSubstitution, id }] of savedRegexFilters.entries()) {
        addRules.push(generateAddRule({ id, regexFilter, regexSubstitution }))
      }
    }

    // make sure that the default rules are added.
    for (const { originUrl, getRedirectUrl, getPort, priority } of DEFAULT_LOCAL_RULES) {
      const port = getPort(state)
      const regexFilter = `^${escapeURLRegex(`${originUrl}:${port}`)}\\/${defaultNSRegexStr}\\/${RULE_REGEX_ENDING}`
      const regexSubstitution = getRedirectUrl(port)

      if (!savedRegexFilters.has(regexFilter)) {
        // We need to add the new rule.
        addRules.push(saveAndGenerateRule({ regexFilter, regexSubstitution, priority }))
      }
    }

    await browser.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds })
  }
}

/**
 * Saves and Generates a rule for the declarativeNetRequest API.
 *
 * @param regexFilter - The regex filter for the rule.
 * @param regexSubstitution  - The regex substitution for the rule.
 * @param excludedInitiatorDomains - The domains that are excluded from the rule.
 * @returns
 */
function saveAndGenerateRule ({
  regexFilter,
  regexSubstitution,
  excludedInitiatorDomains = [],
  priority
}: redirectRegexPair & {
  excludedInitiatorDomains?: string[],
  priority?: number
}): browser.DeclarativeNetRequest.Rule {
  // We need to generate a random ID for the rule.
  const id = Math.floor(Math.random() * 29999)
  // We need to save the regex filter and ID to check if the rule already exists later.
  savedRegexFilters.set(regexFilter, { id, regexSubstitution })
  return generateAddRule({ id, regexFilter, regexSubstitution, excludedInitiatorDomains, priority })
}

/**
 * Generates a rule for the declarativeNetRequest API.
 *
 * @param regexFilter - The regex filter for the rule.
 * @param regexSubstitution  - The regex substitution for the rule.
 * @param excludedInitiatorDomains - The domains that are excluded from the rule.
 * @returns
 */
export function generateAddRule ({
  id,
  priority = 10,
  regexFilter,
  regexSubstitution,
  excludedInitiatorDomains = []
}: redirectRegexPair & {
  id: number,
  priority?: number,
  excludedInitiatorDomains?: string[]
}): browser.DeclarativeNetRequest.Rule {
  return {
    id,
    priority,
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
  getState: () => CompanionState
): (input: redirectPair) => Promise<void> {
  // setup listeners for the extension.
  setupListeners({
    [GLOBAL_STATE_OPTION_CHANGE]: async (): Promise<void> => {
      log('GLOBAL_STATE_OPTION_CHANGE')
      await cleanupRules(true)
      await reconcileRulesAndRemoveOld(getState())
    },
    [DELETE_RULE_REQUEST]: async (value: number): Promise<void> => {
      if (value != null) {
        await cleanupRuleById(value)
        await browser.runtime.sendMessage({ type: DELETE_RULE_REQUEST_SUCCESS })
      } else {
        await cleanupRules(true)
      }
    }
  })

  // returning a closure to avoid passing `getState` as an argument to `addRuleToDynamicRuleSet`.
  return async function ({ originUrl, redirectUrl }: redirectPair): Promise<void> {
    // update the rules so that the next request is handled correctly.
    const state = getState()
    const redirectIsOrigin = originUrl === redirectUrl
    const redirectIsLocal = isLocalHost(originUrl) && isLocalHost(redirectUrl)
    const badOriginRedirect = originUrl.includes(state.gwURL.host) && !redirectUrl.includes('recovery')
    // We don't want to redirect to the same URL. Or to the gateway.
    if (redirectIsOrigin || badOriginRedirect || redirectIsLocal
    ) {
      return
    }

    // first update the tab to apply the new rule.
    const tabs = await browser.tabs.query({ url: `${originUrl}*` })
    await Promise.all(tabs.map(async tab => await browser.tabs.update(tab.id, { url: redirectUrl })))

    // Then update the rule set for future, we need to construct the regex filter and substitution.
    const { regexSubstitution, regexFilter } = constructRegexFilter({ originUrl, redirectUrl })

    const savedRule = savedRegexFilters.get(regexFilter)
    if (savedRule === undefined || savedRule.regexSubstitution !== regexSubstitution) {
      const removeRuleIds: number[] = []
      if (savedRule !== undefined) {
        // We need to remove the old rule because the substitution has changed.
        removeRuleIds.push(savedRule.id)
        savedRegexFilters.delete(regexFilter)
      }

      await browser.declarativeNetRequest.updateDynamicRules(
        {
          // We need to add the new rule.
          addRules: [saveAndGenerateRule({ regexFilter, regexSubstitution })],
          // We need to remove the old rules.
          removeRuleIds
        }
      )
    }
    // call to reconcile rules and remove old ones.
    await reconcileRulesAndRemoveOld(state)
  }
}
