'use strict'

const browser = require('webextension-polyfill')

async function findUrlForContext (context) {
  if (context) {
    if (context.linkUrl) {
      // present when clicked on a link
      return context.linkUrl
    }
    if (context.srcUrl) {
      // present when clicked on page element such as image or video
      return context.srcUrl
    }
    if (context.pageUrl) {
      // pageUrl is the root frame
      return context.pageUrl
    }
  }
  // falback to the url of current tab
  const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
  return currentTab.url
}

module.exports.findUrlForContext = findUrlForContext
