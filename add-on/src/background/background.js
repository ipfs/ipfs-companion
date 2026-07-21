'use strict'

import browser from 'webextension-polyfill'
import createIpfsCompanion, { kuboRpcStatusAlarmName } from '../lib/ipfs-companion.js'
import { onInstalled } from '../lib/on-installed.js'
import { getUninstallURL } from '../lib/on-uninstalled.js'

// register lifecycle hooks early, otherwise we miss first install event
browser.runtime.onInstalled.addListener(onInstalled)
browser.runtime.setUninstallURL(getUninstallURL(browser))

// The RPC status alarm is what wakes a dormant MV3 service worker. Its listener
// must be attached synchronously here, in the first tick of the top-level
// script, so the wake is delivered even while the async init below is still
// running. Registering it inside init (after awaits) would race the wake event.
let companion
let initializing = true
const companionReady = createIpfsCompanion().then((instance) => {
  companion = instance
  initializing = false
})

if (browser.alarms) {
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== kuboRpcStatusAlarmName) return
    // On a cold wake the service worker was started by this alarm, and init
    // (createIpfsCompanion) runs its own first poll, so polling again here would
    // hit the RPC twice. Only a warm alarm, where init ran long ago, drives it.
    const coldWake = initializing
    await companionReady
    if (coldWake) return
    await companion.apiStatusUpdate()
  })
}
