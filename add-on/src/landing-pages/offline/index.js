'use strict'
/* eslint-env browser, webextensions */

const browser = require('webextension-polyfill')
const choo = require('choo')
const createOfflinePage = require('./page')

const app = choo()

app.route('*', createOfflinePage(browser.i18n))
app.mount('#root')
