import browser from 'webextension-polyfill'
import debug from 'debug'

const log = debug('ipfs-companion:redirect-handler:blockOrObserve')
log.error = debug('ipfs-companion:redirect-handler:blockOrObserve:error')

const savedRegexFilters = new Map<string, string>()

type redirectHandlerInput = {
  originUrl: string
  redirectUrl: string
}

/**
 * Construct a regex filter and substitution for a redirect.
 *
 * @param originUrl
 * @param redirectUrl
 * @returns
 */
function constructRegexFilter({ originUrl, redirectUrl }: redirectHandlerInput): {
  regexSubstitution: string,
  regexFilter: string
} {
  // these characters are allowed in the URL, but not in the regex.
  const ALLOWED_CHARS_URL_REGEX = /([:\/\?#\[\]@!$&'\(\)\*\+,;=-_\.~])/g
  // We can traverse the URL from the end, and find the first character that is different.
  let commonIdx = 1;
  while (commonIdx < Math.min(originUrl.length, redirectUrl.length)) {
    if (originUrl[originUrl.length - commonIdx] !== redirectUrl[redirectUrl.length - commonIdx]) {
      break;
    }
    commonIdx += 1
  }

  // We can now construct the regex filter and substitution.
  const regexSubstitution = redirectUrl.slice(0, redirectUrl.length - commonIdx + 1) + '\\1'
  // We need to escape the characters that are allowed in the URL, but not in the regex.
  const regexFilterFirst = `${originUrl.slice(0, originUrl.length - commonIdx + 1).replace(ALLOWED_CHARS_URL_REGEX, '\\$1')}`
  // We need to match the rest of the URL, so we can use a wildcard.
  const regexFilter = `^${regexFilterFirst}(.*)$`

  return { regexSubstitution, regexFilter }
}

// We need to check if the browser supports the declarativeNetRequest API.
export const supportsBlock = !(browser.declarativeNetRequest?.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES === 5000)

// If the browser supports the declarativeNetRequest API, we can block the request.
export function getExtraInfoSpec<T>(additionalParams: T[] = []): T[] {
  if (supportsBlock) {
    return ['blocking' as T, ...additionalParams]
  }
  return additionalParams
}

/**
 * Register a redirect rule in the dynamic rule set.
 *
 * @param {redirectHandlerInput} input
 * @returns {Promise<void>}
 */
export async function addRuleToDynamicRuleSet({ originUrl, redirectUrl }: redirectHandlerInput): Promise<void> {
  const id = Math.floor(Math.random() * 29999)
  const { regexSubstitution, regexFilter } = constructRegexFilter({ originUrl, redirectUrl })

  if (!savedRegexFilters.has(regexFilter)) {
    await browser.declarativeNetRequest.updateDynamicRules(
      {
        addRules: [
          {
            id,
            priority: 1,
            action: {
              type: 'redirect',
              redirect: { regexSubstitution }
            },
            condition: {
              regexFilter,
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
        ],
        removeRuleIds: await browser.declarativeNetRequest.getDynamicRules().then((rules) => rules.map((rule) => rule.id))
      }
    )
    savedRegexFilters.set(regexFilter, `${id}`)
  }
}
