'use strict'

const browser = require('webextension-polyfill')
const choo = require('choo')
const AccessControl = require('../../lib/ipfs-proxy/access-control')
const createProxyAclStore = require('./store')
const createProxyAclPage = require('./page')

const app = choo()

app.use(createProxyAclStore(new AccessControl(browser.storage), browser.i18n))
app.route('*', createProxyAclPage(browser.i18n))
app.mount('#root')
