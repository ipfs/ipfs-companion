'use strict'

const browser = require('webextension-polyfill')
const debug = require('debug')
const log = debug('ipfs-companion:notifier')
log.error = debug('ipfs-companion:notifier:error')

function createNotifier (getState) {
  const { getMessage } = browser.i18n
  return async (titleKey, messageKey, messageParam) => {
    const title = browser.i18n.getMessage(titleKey) || titleKey
    let message
    if (messageKey.startsWith('notify_')) {
      message = messageParam ? getMessage(messageKey, messageParam) : getMessage(messageKey)
    } else {
      message = messageKey
    }
    log(`${title}: ${message}`)
    if (getState().displayNotifications && browser && browser.notifications.create) {
      try {
        return await browser.notifications.create({
          type: 'basic',
          iconUrl: browser.extension.getURL('icons/ipfs-logo-on.svg'),
          title: title,
          message: message
        })
      } catch (err) {
        log.error('failed to create a notification', err)
      }
    }
  }
}

module.exports = createNotifier
