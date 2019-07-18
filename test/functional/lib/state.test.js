'use strict'
const { describe, it, beforeEach, before } = require('mocha')
const { expect } = require('chai')
const { initState, offlinePeerCount, buildWebuiURLString } = require('../../../add-on/src/lib/state')
const { optionDefaults } = require('../../../add-on/src/lib/options')
const { URL } = require('url')

describe('state.js', function () {
  describe('initState', function () {
    before(function () {
      global.URL = URL
    })
    it('should copy passed options as-is', () => {
      const expectedProps = Object.assign({}, optionDefaults)
      delete expectedProps.publicGatewayUrl
      delete expectedProps.useCustomGateway
      delete expectedProps.ipfsApiUrl
      delete expectedProps.customGatewayUrl
      const state = initState(optionDefaults)
      for (const prop in expectedProps) {
        expect(state).to.have.property(prop, optionDefaults[prop])
      }
    })
    it('should generate pubGwURL*', () => {
      const state = initState(optionDefaults)
      expect(state).to.not.have.property('publicGatewayUrl')
      expect(state).to.have.property('pubGwURL')
      expect(state).to.have.property('pubGwURLString')
    })
    it('should generate redirect state', () => {
      const state = initState(optionDefaults)
      expect(state).to.not.have.property('useCustomGateway')
      expect(state).to.have.property('redirect')
    })
    it('should generate apiURL*', () => {
      const state = initState(optionDefaults)
      expect(state).to.not.have.property('ipfsApiUrl')
      expect(state).to.have.property('apiURL')
      expect(state).to.have.property('apiURLString')
    })
    it('should generate gwURL*', () => {
      const state = initState(optionDefaults)
      expect(state).to.not.have.property('customGatewayUrl')
      expect(state).to.have.property('gwURL')
      expect(state).to.have.property('gwURLString')
    })
    it('should generate webuiURLString', () => {
      const state = initState(optionDefaults)
      expect(state).to.have.property('webuiURLString')
    })
  })

  describe('offlinePeerCount', function () {
    it('should be equal -1', () => {
      expect(offlinePeerCount).to.be.equal(-1)
    })
  })

  describe('buildWebuiURLString', function () {
    let fakeState
    beforeEach(() => {
      fakeState = { apiURLString: 'http://127.0.0.1:5001/' }
    })
    it('should be throw error on missing apiURLString', () => {
      expect(() => buildWebuiURLString({})).to.throw('Missing apiURLString')
    })
    it('should return /webui for optionDefaults', () => {
      fakeState.webuiFromDNSLink = optionDefaults.webuiFromDNSLink
      expect(buildWebuiURLString(fakeState)).to.be.equal(`${fakeState.apiURLString}webui/`)
    })
    it('should return /webui when webuiFromDNSLink is falsy', () => {
      fakeState.webuiFromDNSLink = undefined
      expect(buildWebuiURLString(fakeState)).to.be.equal(`${fakeState.apiURLString}webui/`)
    })
    it('should return /ipns/webui.ipfs.io when webuiFromDNSLink is true', () => {
      fakeState.webuiFromDNSLink = true
      expect(buildWebuiURLString(fakeState)).to.be.equal(`${fakeState.apiURLString}ipns/webui.ipfs.io/`)
    })
  })
})
