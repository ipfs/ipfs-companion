'use strict'

const browser = require('webextension-polyfill')

function safeTranslation (key) {
  const translation = browser.i18n.getMessage(key)
  return translation || '[i18n: ' + key + ']'
}

module.exports = function () {
  // Search for items with data-i18n attribute and replace them with values from current locale
  const items = document.querySelectorAll('[data-i18n]')
  for (let item of items) {
    const key = item.getAttribute('data-i18n')
    if (key) {
      const translation = safeTranslation(key)
      if (typeof item.value !== 'undefined' && item.value === 'i18n') {
          // things like inputs can trigger translation with value equal "i18n"
        item.value = translation
      } else {
        item.innerText = translation
      }
    }
  }
}
