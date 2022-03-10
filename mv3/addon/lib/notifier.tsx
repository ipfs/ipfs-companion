'use strict'

import browser from 'webextension-polyfill'
import debug from 'debug'
const log = debug('ipfs-companion:notifier')
log.error = debug('ipfs-companion:notifier:error')

// I cannot get the notifications to work, I keep getting errors related to the image not loading
// things i've tried:
// - loading as a data:url
// - loading png
// - inlining the svg
// - moving the svg

export default function createNotifier (getState) {
  // const { getMessage } = browser.i18n
  return async (titleKey, messageKey, messageParam) => {
    // i18n.getMessage is currently not supported for MV3 extensions
    // in chrome. https://bugs.chromium.org/p/chromium/issues/detail?id=1268098
    // const title = browser.i18n.getMessage(titleKey) || titleKey
    // let message
    // if (messageKey.startsWith('notify_')) {
    //   message = messageParam ? getMessage(messageKey, messageParam) : getMessage(messageKey)
    // } else {
    //   message = messageKey
    // }
    const title = titleKey
    const message = messageKey
    log(`${title}: ${message}`)
    if (getState().displayNotifications && browser && browser.notifications.create) {
      try {
        return await browser.notifications.create({
          type: 'basic',
          iconUrl: ('icons/png/ipfs-logo-on_128.png'),
          title: title,
          message: message,
          isClickable: true,
          priority: 2
        }).then((blah) => {
          console.log('thennn: ', blah)
        }).catch(err => {
          console.log('CATCHHH: ', err)
        })
      } catch (err) {
        log.error('failed to create a notification', err)
      }
    }
  }
}
