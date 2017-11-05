'use strict'
/* eslint-env browser, webextensions */

const optionDefaults = Object.freeze({ // eslint-disable-line no-unused-vars
  publicGatewayUrl: 'https://ipfs.io',
  useCustomGateway: true,
  automaticMode: true,
  linkify: false,
  dnslink: false,
  preloadAtPublicGateway: true,
  catchUnhandledProtocols: true,
  displayNotifications: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000
})
