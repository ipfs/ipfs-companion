'use strict'
/* eslint-env browser, webextensions */

require('./browser-action.css')

const choo = require('choo')
const browserActionPage = require('./page')
const browserActionStore = require('./store')

const app = choo()

// Use the store to setup state defaults and event listeners for mutations
app.use(browserActionStore)

// Register our single route
app.route('*', browserActionPage)

// Start the application and render it to the given querySelector
app.mount('#root')
