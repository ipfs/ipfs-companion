'use strict'

import './proxy-access-dialog.css'

import browser from 'webextension-polyfill'
import choo from 'choo'
import createProxyAccessDialogStore from './store.js'
import createProxyAccessDialogPage from './page.js'

const app = choo()

app.use(createProxyAccessDialogStore(browser.i18n, browser.runtime))
app.route('*', createProxyAccessDialogPage(browser.i18n))
app.mount('#root')

// Fix for Fx57 bug where bundled page loaded using
// browser.windows.create won't show contents unless resized.
// See https://bugzilla.mozilla.org/show_bug.cgi?id=1402110
browser.windows.getCurrent()
  .then(win => browser.windows.update(win.id, { width: win.width + 1 }))
