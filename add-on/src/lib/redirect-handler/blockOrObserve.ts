import browser from 'webextension-polyfill'
import debug from 'debug'

const log = debug('ipfs-companion:redirect-handler:blockOrObserve')
log.error = debug('ipfs-companion:redirect-handler:blockOrObserve:error')
debug.enable('ipfs-companion:redirect-handler:blockOrObserve')

export const supportsBlock: boolean = !(browser.declarativeNetRequest?.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES === 5000)

export function getExtraInfoSpec<T> (additionalParams: T[] = []): T[] {
  if (supportsBlock) {
    return ['blocking' as T, ...additionalParams]
  }
  return additionalParams
}

export async function addRuleToDynamicRuleset ({
  originUrl,
  redirectUrl
}: {
  originUrl: string
  redirectUrl: string
}): Promise<void> {
  const id = Math.floor(Math.random() * 29999)
  const domain = new URL(originUrl).hostname
  debug(`addRuleToDynamicRuleset ${JSON.stringify({ id, domain, redirectUrl })}`)
  // TODO(DJ): need to add error handling for collisions
  await browser.declarativeNetRequest.updateDynamicRules(
    {
      addRules: [
        {
          id,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { url: redirectUrl }
          },
          condition: { urlFilter: originUrl, resourceTypes: ['main_frame'] }
        }
      ]
    }
  )
}
