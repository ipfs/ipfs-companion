import browser from 'webextension-polyfill'
import debug from 'debug'
import { optionDefaults } from '../options.js'

export async function debuggerInit (): Promise<void> {
  enableDebugger()
  setupListeners()
}

function setupListeners (): void {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.logNamespaces) {
      enableDebugger()
    }
  })
}

async function enableDebugger (): Promise<void> {
  const debugNs = (await browser.storage.local.get({ logNamespaces: optionDefaults.logNamespaces })).logNamespaces
  debug.enable(debugNs)
}
