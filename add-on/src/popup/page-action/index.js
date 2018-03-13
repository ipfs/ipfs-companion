'use strict'
/* eslint-env browser, webextensions */

const choo = require('choo')
const pageActionPage = require('./page')
const browserActionStore = require('../browser-action/store')

const app = choo()

// Reuse store to setup state defaults and event listeners for mutations
app.use(browserActionStore)

// Register our single route
app.route('*', pageActionPage)

// Start the application and render it to the given querySelector
app.mount('#root')
