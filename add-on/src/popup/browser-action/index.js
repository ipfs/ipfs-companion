'use strict'
/* eslint-env browser, webextensions */

const choo = require('choo')
const browserActionPage = require('./page')
const store = require('./store')

const app = choo()

app.use(store)
app.route('*', browserActionPage)
app.mount('#root')
