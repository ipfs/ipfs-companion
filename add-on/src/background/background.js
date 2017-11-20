'use strict'
/* eslint-env browser, webextensions */

const init = require('../lib/ipfs-companion')

// init add-on after all libs are loaded
document.addEventListener('DOMContentLoaded', init)
