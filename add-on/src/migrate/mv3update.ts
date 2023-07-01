import browser from 'webextension-polyfill';

interface IResult {
  logNamespaces?: string;
  countly?: {
    container: string;
    [key: string]: string;
  };
}

function parseLocalStorage(): IResult {
  const data = localStorage;
  const result: IResult = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'debug') {
      result['logNamespaces'] = value;
      return
    }
    if (key.includes('cly')) {
      const [container, clyKey] = key.split('/');
      if (!('countly' in result)) {
        result['countly'] = {
          container
        }
      }
      result['countly'][clyKey] = value;
      return
    }
  })
  return result
}

browser.runtime.sendMessage({
  type: 'ipfs-companion-migrate',
  payload: {
    localStorage: parseLocalStorage()
  }
})
