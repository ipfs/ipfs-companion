import browser from 'webextension-polyfill'
import debug from 'debug'
import { optionDefaults } from '../options.js'

export async function debuggerInit (): Promise<void> {
  await enableDebugger()
  await setupListeners()
}

function setupListeners (): void {
  browser.storage.onChanged.addListener((changes, areaName): void => {
    if (areaName === 'local' && ('logNamespaces' in changes)) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      enableDebugger()
    }
  })
}

async function enableDebugger (): Promise<void> {
  const debugNs = (await browser.storage.local.get({ logNamespaces: optionDefaults.logNamespaces })).logNamespaces
  debug.enable(debugNs)
}
