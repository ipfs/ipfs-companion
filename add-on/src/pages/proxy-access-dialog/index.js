'use strict'

require('./proxy-access-dialog.css')

const browser = require('webextension-polyfill')
const choo = require('choo')
const createProxyAccessDialogStore = require('./store')
const createProxyAccessDialogPage = require('./page')

const app = choo()

app.use(createProxyAccessDialogStore(browser.i18n, browser.runtime))
app.route('*', createProxyAccessDialogPage(browser.i18n))
app.mount('#root')

// Fix for Fx57 bug where bundled page loaded using
// browser.windows.create won't show contents unless resized.
// See https://bugzilla.mozilla.org/show_bug.cgi?id=1402110
browser.windows.getCurrent()
  .then(win => browser.windows.update(win.id, { width: win.width + 1 }))
