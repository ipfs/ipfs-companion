'use strict'
/* eslint-env browser, webextensions */

const optionDefaults = Object.freeze({ // eslint-disable-line no-unused-vars
  publicGateways: 'ipfs.io gateway.ipfs.io ipfs.pics global.upload',
  useCustomGateway: true,
  automaticMode: true,
  linkify: false,
  dnslink: false,
  catchUnhandledProtocols: true,
  customGatewayUrl: 'http://127.0.0.1:8080',
  ipfsApiUrl: 'http://127.0.0.1:5001',
  ipfsApiPollMs: 3000
  // TODO:
  // defaultToFsProtocol
})
