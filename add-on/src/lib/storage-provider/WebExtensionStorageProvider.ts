import type { StorageProviderInterface } from '@ipfs-shipyard/ignite-metrics/StorageProvider'
import browser from 'webextension-polyfill'

type consentTypes = 'all' | 'except-all'

export class WebExtensionStorageProvider implements StorageProviderInterface {
  async setStore (consentArray: consentTypes[]): Promise<void> {
    try {
      const jsonString = JSON.stringify(consentArray)
      if ('localStorage' in globalThis) {
        globalThis.localStorage.setItem('@ipfs-shipyard/ignite-metrics:consent', jsonString)
      } else {
        await browser.storage.local.set({ '@ipfs-shipyard/ignite-metrics:consent': jsonString })
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  async getStore (): Promise<consentTypes[]> {
    try {
      let jsonString
      if ('localStorage' in globalThis) {
        jsonString = globalThis.localStorage.getItem('@ipfs-shipyard/ignite-metrics:consent')
      } else {
        jsonString = (await browser.storage.local.get(['@ipfs-shipyard/ignite-metrics:consent']))['@ipfs-shipyard/ignite-metrics:consent']
      }
      if (jsonString != null) {
        return JSON.parse(jsonString)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
    /**
     * Return minimal consent if there is nothing in the store.
     */
    return ['minimal']
  }
}
