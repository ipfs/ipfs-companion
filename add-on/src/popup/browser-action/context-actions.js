'use strict'
/* eslint-env browser, webextensions */

import browser from 'webextension-polyfill'
import html from 'choo/html/index.js'
import navItem from './nav-item.js'
import navHeader from './nav-header.js'
import { sameGateway } from '../../lib/ipfs-path.js'
import { formatImportDirectory } from '../../lib/ipfs-import.js'
import {
  contextMenuViewOnGateway,
  contextMenuCopyAddressAtPublicGw,
  contextMenuCopyPermalink,
  contextMenuCopyRawCid,
  contextMenuCopyCanonicalAddress,
  contextMenuCopyCidAddress
} from '../../lib/context-menus.js'

const notReady = browser.i18n.getMessage('panelCopy_notReadyHint')

// Context Actions are displayed in Browser Action and Page Action (FF only)
export function contextActions({
  active,
  redirect,
  isRedirectContext,
  pubGwURLString,
  gwURLString,
  currentTab,
  currentFqdn,
  currentDnslinkFqdn,
  currentTabIntegrationsOptOut,
  currentTabContentPath = notReady,
  currentTabImmutablePath = notReady,
  currentTabCid = notReady,
  currentTabPublicUrl = notReady,
  currentTabPermalink = notReady,
  ipfsNodeType,
  isIpfsContext,
  isIpfsOnline,
  isApiAvailable,
  onToggleSiteIntegrations,
  onViewOnGateway,
  onCopy,
  importDir,
  onFilesCpImport
}) {
  const activeCidResolver = active && isIpfsOnline && isApiAvailable && currentTabCid
  const activeFilesCpImport = active && isIpfsOnline && isApiAvailable && !ipfsNodeType.startsWith('embedded')
  const isMutable = currentTabContentPath.startsWith('/ipns/')
  const activeViewOnGateway = (currentTab) => {
    if (!currentTab) return false
    const { url } = currentTab
    return !(url.startsWith('ip') || sameGateway(url, gwURLString) || sameGateway(url, pubGwURLString))
  }
  const renderIpfsContextItems = () => {
    if (!isIpfsContext) return
    return html`<div>
  ${activeViewOnGateway(currentTab)
    ? navItem({
      text: browser.i18n.getMessage(contextMenuViewOnGateway),
      onClick: () => onViewOnGateway(contextMenuViewOnGateway)
    })
    : null}
  ${navItem({
    text: browser.i18n.getMessage(contextMenuCopyAddressAtPublicGw),
    title: browser.i18n.getMessage('panel_copyCurrentPublicGwUrlTooltip'),
    helperText: currentTabPublicUrl,
    onClick: () => onCopy(contextMenuCopyAddressAtPublicGw)
  })}
  ${isMutable
    ? navItem({
      text: browser.i18n.getMessage(contextMenuCopyPermalink),
      title: browser.i18n.getMessage('panel_copyCurrentPermalinkTooltip'),
      helperText: currentTabPermalink,
      onClick: () => onCopy(contextMenuCopyPermalink)
    })
    : ''}
  ${isMutable
    ? navItem({
      text: browser.i18n.getMessage(contextMenuCopyCanonicalAddress),
      title: browser.i18n.getMessage('panelCopy_currentIpnsAddressTooltip'),
      helperText: currentTabContentPath,
      onClick: () => onCopy(contextMenuCopyCanonicalAddress)
    })
    : ''}
  ${navItem({
    text: browser.i18n.getMessage(contextMenuCopyCidAddress),
    title: browser.i18n.getMessage('panelCopy_currentIpfsAddressTooltip'),
    helperText: currentTabImmutablePath,
    onClick: () => onCopy(contextMenuCopyCidAddress)
  })}
  ${navItem({
    text: browser.i18n.getMessage(contextMenuCopyRawCid),
    title: browser.i18n.getMessage('panelCopy_copyRawCidTooltip'),
    helperText: currentTabCid,
    disabled: !activeCidResolver,
    onClick: () => onCopy(contextMenuCopyRawCid)
  })}
  ${navItem({
    text: browser.i18n.getMessage('panel_importCurrentIpfsAddress'),
    title: browser.i18n.getMessage('panel_importCurrentIpfsAddressTooltip'),
    helperText: formatImportDirectory(importDir),
    disabled: !activeFilesCpImport,
    onClick: onFilesCpImport
  })}
  </div>
    `
  }
  const renderSiteIntegrationsToggle = () => {
    if (!isRedirectContext) return
    return html`
  ${navItem({
    text: browser.i18n.getMessage('panel_activeTabSiteIntegrationsToggle', currentFqdn),
    title: browser.i18n.getMessage('panel_activeTabSiteIntegrationsToggleTooltip', currentFqdn),
    style: 'truncate',
    disabled: !(active),
    switchValue: active && !currentTabIntegrationsOptOut,
    onClick: onToggleSiteIntegrations
  })}
      `
  }
  return html`
    <div class='fade-in pv1'>
  ${renderSiteIntegrationsToggle()}
  ${renderIpfsContextItems()}
    </div>
  `
}

// "Active Tab" section is displayed in Browser Action  only
// if redirect can be toggled or current tab has any IPFS Context Actions
export function activeTabActions(state) {
  const showActiveTabSection = (state.isRedirectContext) || state.isIpfsContext
  if (!showActiveTabSection) return
  return html`
      <div class="mb1">
      ${navHeader('panel_activeTabSectionHeader')}
      <div class="fade-in pv0">
        ${contextActions(state)}      </div>
      </div>
  `
}
