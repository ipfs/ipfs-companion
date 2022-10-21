'use strict'
/* eslint-env browser, webextensions */

import './welcome.css'

import browser from 'webextension-polyfill'
import choo from 'choo'
import createWelcomePageStore from './store.js'
import createWelcomePage from './page.js'

const app = choo()

app.use(createWelcomePageStore(browser.i18n, browser.runtime))
app.route('*', createWelcomePage(browser.i18n))
app.mount('#root')
