import browser from 'webextension-polyfill'
import debug from 'debug'

const log = debug('ipfs-companion:mv3update')
log.error = debug('ipfs-companion:mv3update:error')

interface IResult {
  logNamespaces?: string
  countly?: {
    container: string
    [key: string]: string
  }
}

function parseLocalStorage (): IResult {
  const data = localStorage
  const result: IResult = {}
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'debug') {
      result.logNamespaces = value
      return
    }
    if (key.includes('cly')) {
      const [container, clyKey] = key.split('/')
      if (!('countly' in result)) {
        result.countly = {
          container
        }
      }
      result.countly[clyKey] = value
    }
  })
  return result
}

browser.runtime.sendMessage({
  type: 'ipfs-companion-migrate',
  payload: {
    localStorage: parseLocalStorage()
  }
}).catch(e => log.error(e))
