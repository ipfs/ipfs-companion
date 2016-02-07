'use strict'

const {Cc, Ci} = require('chrome')
const cm = require('sdk/context-menu')
const clipboard = require('sdk/clipboard')
const l10n = require('sdk/l10n').get
const gw = require('./gateways.js')
const api = require('./api.js')
const prefs = require('sdk/simple-prefs').prefs
const panels = require('sdk/panel')
const tabs = require('sdk/tabs')
const self = require('sdk/self')

/*
 * PANEL & BUTTON
 */

const panel = panels.Panel({
  contentURL: self.data.url('panel.html'),
  contentScriptFile: self.data.url('panel.js'),
  onHide: buttonPanelHide
})

exports.toggleButtonPanel = panel

const {ToggleButton} = require('sdk/ui/button/toggle')

const ON_STATE = {
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  badge: 'ON',
  badgeColor: '#4A9EA1'
}

const OFF_STATE = {
  icon: {
    '16': './icon-off-16.png',
    '32': './icon-off-32.png',
    '64': './icon-off-64.png'
  },
  badge: 'OFF',
  badgeColor: '#8C8C8C'
}

const button = new ToggleButton({
  id: 'ipfs-gateway-status',
  label: l10n('toggle_button_label'),
  icon: {
    '16': './icon-on-16.png',
    '32': './icon-on-32.png',
    '64': './icon-on-64.png'
  },
  onChange: buttonPanelShow
})

function buttonPanelShow (state) {
  if (state.checked) {
    panel.show({
      position: button
    })
  }
}

function buttonPanelHide () {
  button.state('window', {
    checked: false
  })
}

exports.toggleButton = button
exports.toggleButtonOn = ON_STATE
exports.toggleButtonOff = OFF_STATE

function setButtonState (trueFalse) {
  let newState = trueFalse ? ON_STATE : OFF_STATE
  Object.keys(newState).forEach((k) => {
    button[k] = newState[k]
  })
}

exports.setButtonBadge = (peerCount) => {
  button.badge = peerCount !== null ? peerCount : OFF_STATE.badge
  if (gw.redirectEnabled) {
    button.badgeColor = (peerCount < 1) ? 'red' : ON_STATE.badgeColor
  }
}

/*
 * COMMON (PANEL & CONTEXT MENU)
 */
function getCurrentURI () {
  return Cc['@mozilla.org/appshell/window-mediator;1']
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow('navigator:browser')
    .getBrowser().currentURI
}

function pinCurrentIpfsAddress () {
  api.pin(getCurrentURI().spec.replace(gw.customUri.spec, '/'))
}

function copyCurrentIpfsAddress () {
  clipboard.set(getCurrentURI().spec.replace(gw.customUri.spec, '/'))
}
exports.copyCurrentIpfsAddress = copyCurrentIpfsAddress

function copyCurrentPublicGwUrl () {
  clipboard.set(getCurrentURI().spec.replace(gw.customUri.spec, gw.publicUri.spec))
}
exports.copyCurrentPublicGwUrl = copyCurrentPublicGwUrl

/*
 * PANEL EVENTS: Outgoing
 */

// Send "show" event to the panel's script, so the
// script can prepare the panel for display.
panel.on('show', function () {
  let currentUri = getCurrentURI().spec
  let context = {
    'preferences': prefs,
    'uri': currentUri,
    'isPinnable': gw.isPinnable(currentUri)
  }
  // trigger panel init/refresh
  panel.port.emit('show', context)

  // async update of version info
  api.getVersion((data) => {
    panel.port.emit('version', data)
  })
  // async update peer info
  api.getSwarmPeers((data) => {
    panel.port.emit('swarm-peers', data)
  })
})

/*
 * PANEL EVENTS: Incoming (from panel's content script)
 */

// resize panel to values sent from page script
panel.port.on('resize', function (size) {
  panel.resize(size.width, size.height)
})

// Wrapper to provide UX fix:
// we want panel to hide after each action
function hidePanelAnd (funct) {
  return function () {
    panel.hide()
    funct()
  }
}

panel.port.on('toggle-gateway-redirect', hidePanelAnd(function () {
  if (prefs.automatic && gw.redirectEnabled) {
    // https://github.com/lidel/ipfs-firefox-addon/issues/62
    prefs.automatic = false
  }
  gw.redirectEnabled = !gw.redirectEnabled
}))

panel.port.on('open-webui', hidePanelAnd(function () {
  let WEBUI_URI = 'http://' + prefs.customGatewayHost + ':' + prefs.customApiPort + '/webui'
  tabs.open(WEBUI_URI)
}))

panel.port.on('open-preferences', hidePanelAnd(function () {
  tabs.open({
    url: 'about:addons',
    onReady: function (tab) {
      tab.attach({
        contentScriptWhen: 'end',
        contentScript: 'if (typeof AddonManager !== \'undefined\'){AddonManager.getAddonByID("' + self.id + '", function(aAddon) {' +
          'unsafeWindow.gViewController.commands.cmd_showItemDetails.doCommand(aAddon, true);' +
          '});}'
      })
    }
  })
}))

panel.port.on('pin-current-ipfs-address', hidePanelAnd(pinCurrentIpfsAddress))
panel.port.on('copy-current-ipfs-address', hidePanelAnd(copyCurrentIpfsAddress))
panel.port.on('copy-current-public-gw-url', hidePanelAnd(copyCurrentPublicGwUrl))

/*
 * CONTEXT MENU ITEMS
 */

const PIN_IPFS_ADDRESS = cm.Item({
  label: l10n('panel_pin-current-ipfs-address'),
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: pinCurrentIpfsAddress
})

const COPY_IPFS_ADDRESS = cm.Item({
  label: l10n('panel_copy-current-ipfs-address'),
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: copyCurrentIpfsAddress
})

const COPY_PUBLIC_HTTP_URL = cm.Item({
  label: l10n('panel_copy-current-public-gw-url'),
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: copyCurrentPublicGwUrl
})

cm.Menu({
  label: 'IPFS',
  items: [PIN_IPFS_ADDRESS, COPY_IPFS_ADDRESS, COPY_PUBLIC_HTTP_URL]
})

gw.onPreferencesChange(() => {
  // update button to reflect current state
  setButtonState(gw.redirectEnabled)

  for (let ctx of [PIN_IPFS_ADDRESS.context, COPY_PUBLIC_HTTP_URL.context, COPY_IPFS_ADDRESS.context]) {
    let url = gw.customUri.spec + '*'
    ctx.add(cm.URLContext(url))
  }
})
