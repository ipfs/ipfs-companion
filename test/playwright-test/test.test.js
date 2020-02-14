const { describe, it } = require('mocha')
const { expect } = require('chai')

describe('playwright-test web context', function () {
  it('should have chrome extension APIs', function () {
    expect(typeof chrome).to.equal('object')
    expect(typeof chrome.runtime.id).to.equal('string')
  })
})
