'use strict'
/* eslint-env browser, webextensions */

require('./offline.css')

const browser = require('webextension-polyfill')
const choo = require('choo')
const createOfflinePageStore = require('./store')
const createOfflinePage = require('./page')

const app = choo()

app.use(createOfflinePageStore(browser.i18n, browser.runtime))
app.route('*', createOfflinePage(browser.i18n))
app.mount('#root')
