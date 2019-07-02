'use strict'
const { expect } = require('chai')

exports.url2request = (string) => {
  return { url: string, type: 'main_frame' }
}

exports.expectNoRedirect = (modifyRequest, request) => {
  expect(modifyRequest.onBeforeRequest(request)).to.equal(undefined)
  expect(modifyRequest.onHeadersReceived(request)).to.equal(undefined)
}

exports.fakeRequestId = () => {
  return Math.floor(Math.random() * 100000).toString()
}

exports.nodeTypes = ['external', 'embedded']
