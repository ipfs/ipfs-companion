'use strict'

/* eslint-env browser, webextensions */

import debug from 'debug'

import { precache } from '../precache.js'
import * as external from './external.js'
import {
  InternalTabReloader,
  LocalGatewayReloader,
  WebUiReloader,
  prepareReloadExtensions
} from './reloaders/index.js'
const log = debug('ipfs-companion:client')
log.error = debug('ipfs-companion:client:error')

// ensure single client at all times, and no overlap between init and destroy
let client

export async function initIpfsClient (browser, opts, inQuickImport) {
  log('init ipfs client')
  if (client) return // await destroyIpfsClient()
  let backend
  switch (opts.ipfsNodeType) {
    case 'external':
      backend = external
      break
    default:
      throw new Error(`Unsupported ipfsNodeType: ${opts.ipfsNodeType}`)
  }
  const instance = await backend.init(browser, opts)
  if (!inQuickImport) {
    _reloadIpfsClientDependents(browser, instance, opts) // async (API is present)
  }
  client = backend
  return instance
}

export async function destroyIpfsClient (browser) {
  log('destroy ipfs client')
  if (!client) return
  try {
    // Only destroy if client has a destroy method (not SW Gateway)
    if (client.destroy) {
      await client.destroy(browser)
    }
    await _reloadIpfsClientDependents(browser) // sync (API stopped working)
  } finally {
    client = null
  }
}

/**
 * Reloads pages dependant on ipfs to be online
 *
 * @typedef {external} Browser
 * @param {Browser} browser
 * @param {import('kubo-rpc-client').default} instance
 * @param {Object} opts
 * @param {Array.[InternalTabReloader|LocalGatewayReloader|WebUiReloader]=} reloadExtensions
 * @returns {void}
 */
async function _reloadIpfsClientDependents (
  browser, instance, opts, reloadExtensions = [WebUiReloader, LocalGatewayReloader, InternalTabReloader]) {
  // online || offline
  if (browser.tabs && browser.tabs.query) {
    const tabs = await browser.tabs.query({})
    if (tabs) {
      try {
        const reloadExtensionInstances = await prepareReloadExtensions(reloadExtensions, browser, log)
        // the reload process is async, fire and forget.
        reloadExtensionInstances.forEach(ext => ext.reload(tabs))
      } catch (e) {
        log('Failed to trigger reloaders')
      }
    }
  }

  // online only
  if (client && instance && opts) {
    // add important data to local ipfs repo for instant load
    setTimeout(() => precache(instance, opts), 5000)
  }
}

/**
 * Reloads local gateway pages dependant on ipfs to be online
 *
 * @typedef {external} Browser
 * @param {Browser} browser
 * @param {import('kubo-rpc-client').default} instance
 * @param {Object} opts
 * @returns {void}
 */
export function reloadIpfsClientOfflinePages (browser, instance, opts) {
  _reloadIpfsClientDependents(browser, instance, opts, [LocalGatewayReloader])
}
