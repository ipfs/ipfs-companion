'use strict'

const browser = require('webextension-polyfill')
const choo = require('choo')
const createProxyAccessDialogStore = require('./store')
const createProxyAccessDialogPage = require('./page')

const app = choo()

app.use(createProxyAccessDialogStore(browser.i18n, browser.runtime))
app.route('*', createProxyAccessDialogPage(browser.i18n))
app.mount('#root')
