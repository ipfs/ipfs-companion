'use strict'
/* eslint-env browser, webextensions */

import './options.css'

import { i18n } from 'webextension-polyfill'
import choo from 'choo'
import optionsPage from './page.js'
import optionsStore from './store.js'

const app = choo()

// Use the store to setup state defaults and event listeners for mutations
app.use(optionsStore)

// Register our single route
app.route('*', optionsPage)

// Start the application and render it to the given querySelector
app.mount('#root')

// Set page title and header translation
document.getElementById('header-text').innerText = i18n.getMessage('option_page_header')
document.title = i18n.getMessage('option_page_title')
