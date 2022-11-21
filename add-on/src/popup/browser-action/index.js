'use strict'
/* eslint-env browser, webextensions */

import './browser-action.css'

import choo from 'choo'
import browserActionPage from './page.js'
import browserActionStore from './store.js'

const app = choo()

// Use the store to setup state defaults and event listeners for mutations
app.use(browserActionStore)

// Register our single route
app.route('*', browserActionPage)

// Start the application and render it to the given querySelector
app.mount('#root')
