'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')

/**
 * Renders a translated string with html anchors.
 * @param {String} message The message to translate.
 * @param {Array} links The array of hrefs.
 * @param {Object} attributes HTML attributes to put in the anchor.
 * @return {html} An HTML node with the translated string with anchors.
 */
const renderTranslatedLink = (message, links, attributes) => {
  const regex = /<a>(.+?)<\/a>/mg
  const str = browser.i18n.getMessage(message)
  let match = regex.exec(str)

  let output = str
  let i = 0
  while (match !== null) {
    output = output.replace(match[0], `<a href="${links[i]}" ${attributes}>${match[1]}</a>`)
    match = regex.exec(str)
    i++
  }

  const template = document.createElement('template')
  template.innerHTML = output

  return template.content
}

/**
 * Renders a translated string with html spans.
 * @param {String} message - The message to translate.
 * @param {String} dynamicData - The dynamic data in the translation.
 * @param {Object} attributes HTML attributes to put in the anchor.
 * @return {html} An HTML node with the translated string with spans.
 */
const renderTranslatedDynamicSpan = (message, dynamicData, attributes) => {
  const regex = /<span><\/span>/mg
  const str = browser.i18n.getMessage(message)
  let match = regex.exec(str)

  let output = str
  while (match !== null) {
    output = output.replace(match[0], `<span ${attributes}>${dynamicData}</span>`)
    match = regex.exec(str)
  }

  const template = document.createElement('template')
  template.innerHTML = output

  return template.content
}

module.exports = {
  renderTranslatedLink,
  renderTranslatedDynamicSpan
}
