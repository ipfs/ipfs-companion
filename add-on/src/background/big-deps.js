'use strict'
/* eslint-env browser, webextensions */

// Problem: addons-linter does not permit .js bigger than 4MB (FILE_TOO_LARGE)
// Solution: this file lets us fine-tune to decide what to extract
// into a shared bundle created by browserify+factor-bundle

const Ipfs = require('ipfs')
// const IpfsApi = require('ipfs-api')
const node = new Ipfs({ start: false })
console.log('this code wont run :-)', node)
// console.log('fake api', IpfsApi)
