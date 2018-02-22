'use strict'

const browser = require('webextension-polyfill')
const choo = require('choo')
const createChatStore = require('./store')
const createChatPage = require('./page')

const app = choo()

app.use(createChatStore(browser.i18n, browser.runtime, browser.storage))
app.route('*', createChatPage(browser.i18n))
app.mount('#root')
