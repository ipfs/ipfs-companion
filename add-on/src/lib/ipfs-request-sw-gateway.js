'use strict'
/* eslint-env browser, webextensions */

import debug from 'debug'
const log = debug('ipfs-companion:sw-gateway')

/**
 * Handles Service Worker Gateway redirects
 * @param {import('../types/companion.js').CompanionState} state
 * @param {browser.WebRequest.OnBeforeRequestDetailsType | {url: string, type?: string}} request
 * @returns {Object|undefined}
 */
export function redirectToSwGateway(state, request) {
  // Only redirect if SW Gateway is active
  if (!state.isServiceWorkerGateway || !state.active) {
    return
  }

  if (!request || !request.url) {
    return
  }

  try {
    const url = new URL(request.url)
    
    // Skip if already redirected to SW gateway
    if (url.hostname.includes('inbrowser.link') || 
        url.hostname.includes('inbrowser.dev')) {
      return
    }

    // Check for IPFS/IPNS paths
    const match = url.pathname.match(/^\/(ipfs|ipns)\/([^\/]+)(\/.*)?$/)
    if (!match) return

    const [, protocol, cid, path = ''] = match
    const gatewayUrl = state.serviceWorkerGatewayUrl || 'https://inbrowser.link'
    const gwUrl = new URL(gatewayUrl)
    
    // Use PATH format instead of subdomain to preserve CID case
    // https://inbrowser.link/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/
    const redirectUrl = `${gwUrl.protocol}//${gwUrl.hostname}/${protocol}/${cid}${path}${url.search}${url.hash}`
    
    log(`Redirecting to SW Gateway: ${request.url} → ${redirectUrl}`)
    return { redirectUrl }
  } catch (error) {
    log.error('Error in SW Gateway redirect:', error)
    return
  }
}

/**
 * Check if feature should be disabled for SW Gateway
 * @param {string} feature
 * @param {import('../types/companion.js').CompanionState} state
 * @returns {boolean}
 */
export function isFeatureDisabledForSwGateway(feature, state) {
  if (!state.isServiceWorkerGateway) return false
  
  const disabledFeatures = [
    'quickImport',
    'ipfsProxy',
    'pinning',
    'mfsSupport',
    'ipfsNodeInfo',
    'swarmPeers',
    'webui'
  ]
  
  return disabledFeatures.includes(feature)
}