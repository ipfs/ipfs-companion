'use strict'

const browser = require('webextension-polyfill')

function createNotifier (getState) {
  return (titleKey, messageKey, messageParam) => {
    const title = browser.i18n.getMessage(titleKey)
    let message
    if (messageKey.startsWith('notify_')) {
      message = messageParam ? browser.i18n.getMessage(messageKey, messageParam) : browser.i18n.getMessage(messageKey)
    } else {
      message = messageKey
    }
    if (getState().displayNotifications) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: browser.extension.getURL('icons/ipfs-logo-on.svg'),
        title: title,
        message: message
      })
    }
    console.info(`[ipfs-companion] ${title}: ${message}`)
  }
}

module.exports = createNotifier
