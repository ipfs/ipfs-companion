'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const choo = require('choo')
const createWelcomePageStore = require('./store')
const createWelcomePage = require('./page')

const app = choo()

app.use(createWelcomePageStore(browser.i18n, browser.runtime))
app.route('*', createWelcomePage(browser.i18n))
app.mount('#root')
